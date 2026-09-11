'use strict';
// 腾讯云 CloudBase/SCF 云函数：把请求转发到 Supabase，解决国内手机连不上 *.supabase.co 的问题。
// 前端 config.js 的 url 指向本函数公网地址 + /sb，本函数把 /sb/* 转发到 Supabase。
const https = require('https');
const zlib = require('zlib');

const SUPABASE_HOST = 'elvlygokedgbaihbdgrg.supabase.co';
const SUPABASE_ORIGIN = 'https://' + SUPABASE_HOST;

function doRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        let body = Buffer.concat(chunks);
        // 万一上游还是回了压缩数据（比如网关自己压缩），在这里解压回明文
        const enc = (res.headers['content-encoding'] || '').toLowerCase();
        try {
          if (enc === 'gzip') body = zlib.gunzipSync(body);
          else if (enc === 'deflate') body = zlib.inflateSync(body);
          else if (enc === 'br') body = zlib.brotliDecompressSync(body);
        } catch (e) { /* 解不开就按原文返回 */ }
        // 第二道保险：不看响应头，直接按文件魔数判断。
        // 有些情况下 content-encoding 头会在中途丢失，但数据本身还是压缩的
        // （v1.1.2 的元凶就是它：1f 8b → 被 toString('utf8') 变成 1f efbfbd）
        try {
          if (body.length > 2 && body[0] === 0x1f && body[1] === 0x8b) {
            body = zlib.gunzipSync(body);
          } else if (body.length > 2 && body[0] === 0x78) {
            body = zlib.inflateSync(body);
          }
        } catch (e) { /* 解不开就按原文返回 */ }
        resolve({ statusCode: res.statusCode, headers: res.headers, body: body });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('proxy timeout')));
    if (data) req.write(data);
    req.end();
  });
}

function buildQuery(queryString) {
  const q = queryString || {};
  const parts = Object.keys(q).map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(q[k]));
  return parts.length ? '?' + parts.join('&') : '';
}

async function handle(event, context) {
  const method = (event.httpMethod || 'GET').toUpperCase();

  // CORS 预检直接放行
  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      },
      body: '',
    };
  }

  // CloudBase HTTP 网关路径可能带 /sb 前缀，也可能带环境 stage，这里统一处理
  let path = event.path || '/';
  path = path.replace(/^\/(prod|release|dev|test)\b/, '');
  path = path.replace(/^\/sb/, '');
  if (!path.startsWith('/')) path = '/' + path;

  const queryStr = buildQuery(event.queryString || event.queryStringParameters);
  const fullPath = path + queryStr;

  // 还原请求体（可能 base64 编码）
  let body = event.body || '';
  if (event.isBase64Encoded && body) {
    body = Buffer.from(body, 'base64').toString('utf8');
  }

  // 请求头统一转小写再过滤：腾讯云传来的头可能是 'Accept-Encoding' 这种大写，
  // 按小写 delete 是删不掉的（v1.1.2 第一次修复就栽在这里）
  const raw = event.headers || {};
  const headers = {};
  const SKIP = ['host', 'x-forwarded-for', 'x-forwarded-proto', 'x-forwarded-host',
    'x-real-ip', 'accept-encoding', 'content-length', 'connection'];
  Object.keys(raw).forEach((k) => {
    const lk = String(k).toLowerCase();
    if (SKIP.indexOf(lk) !== -1) return;
    headers[lk] = raw[k];
  });
  // 明确要求上游不要压缩：SCF 回传时会丢 content-encoding 标签，浏览器只能拿到乱码
  headers['accept-encoding'] = 'identity';

  // Supabase 要求请求带 apikey / Authorization；前端 config.js 的 anon key 会在请求头里透传过来
  const options = {
    method: method,
    hostname: SUPABASE_HOST,
    path: fullPath,
    headers: headers,
    timeout: 15000,
  };

  try {
    const upstream = await doRequest(options, (method === 'GET' || method === 'HEAD') ? null : body);
    const respHeaders = {
      'Content-Type': upstream.headers['content-type'] || 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      // 探针头：方便远程确认「新代码是否真的在线」以及上游有没有压缩
      'X-Proxy-Version': '1.1.2-fix2',
      'X-Proxy-Upstream-Encoding': String(upstream.headers['content-encoding'] || 'none'),
    };
    return {
      statusCode: upstream.statusCode,
      headers: respHeaders,
      body: upstream.body.toString('utf8'),
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'proxy_failed', message: String(e && e.message || e) }),
    };
  }
}

// CloudBase 默认入口是 main，SCF 默认入口是 main_handler；两个都导出，兼容任一平台
exports.main = handle;
exports.main_handler = handle;
