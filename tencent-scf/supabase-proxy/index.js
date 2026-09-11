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

  // 透传客户端头，但清掉会造成冲突的头：
  //  - accept-encoding 必须清掉并改成 identity（不压缩）：SCF 回传时会丢掉
  //    content-encoding 标记，浏览器拿到一坨压缩乱码、JSON 解析必失败（v1.1.2 踩过的坑）
  //  - content-length 要删掉：body 若被 base64 解码重写，长度会和原始头对不上
  const headers = Object.assign({}, event.headers || {});
  delete headers.host;
  delete headers['x-forwarded-for'];
  delete headers['x-forwarded-proto'];
  delete headers['x-forwarded-host'];
  delete headers['x-real-ip'];
  delete headers['accept-encoding'];
  delete headers['content-length'];
  delete headers.connection;
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
