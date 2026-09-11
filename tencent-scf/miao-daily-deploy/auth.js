// ============================================================
//  喵日常 · 登录逻辑（邮箱魔法链接）v1.1.2
//  步骤：发送魔法链接 → 用户点邮件链接 → index.html 本地拆凭证登录
//  v1.1.2：发送改为自己 fetch，只看状态码、**完全不解析回应内容**
//  （腾讯云网关会给压缩乱码且丢标签，SDK 解析必报错；但我们根本不需要看回应）
// ============================================================
(function () {
  'use strict';

  var cfg = window.SUPABASE_CONFIG || {};
  var form = document.getElementById('loginForm');
  var emailInput = document.getElementById('email');
  var msg = document.getElementById('loginMsg');
  var btn = document.getElementById('sendMagicLink');

  function setMsg(text, type) {
    msg.textContent = text || '';
    msg.className = 'login-msg' + (type ? ' ' + type : '');
  }

  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  // 已有本地会话（之前登录过没退出）→ 直接进主页，不问 SDK（SDK 在手机上可能卡死）
  // 带 ?force=1 时就算已登录也停在登录页（方便换号/重新登录）
  var force = /[?&]force=1/.test(window.location.search);
  try {
    var own = JSON.parse(localStorage.getItem('miao_daily_session') || 'null');
    if (!force && own && own.user && own.user.id) {
      window.location.replace('index.html');
      return;
    }
  } catch (e) {}

  // 兜底：万一邮件链接是跳回登录页的（网址 # 后面带着凭证），这里也认，别把凭证弄丢
  (function () {
    try {
      var hh = (window.location.hash || '').replace(/^#/, '');
      // 有些邮箱 App / 中间页会把 # 后的凭证改写成 ? 后的查询参数，两种都认
      var qs = (window.location.search || '').replace(/^\?/, '');
      var src = /access_token=/.test(hh) ? hh : (/access_token=/.test(qs) ? qs : '');
      if (!src) return;
      var p = new URLSearchParams(src);
      var at = p.get('access_token');
      if (!at) return;
      var seg = at.split('.')[1] || '';
      var b = seg.replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      var payload = JSON.parse(atob(b));
      if (!payload || !payload.sub) return;
      var now = Math.floor(Date.now() / 1000);
      localStorage.setItem('miao_daily_session', JSON.stringify({
        provider_token: null,
        access_token: at,
        refresh_token: p.get('refresh_token') || '',
        token_type: 'bearer',
        expires_in: parseInt(p.get('expires_in') || '3600', 10) || 3600,
        expires_at: payload.exp || (now + 3600),
        user: { id: payload.sub, email: payload.email || '', role: 'authenticated', user_metadata: {} }
      }));
      window.location.replace('index.html');
    } catch (e) {}
  })();

  // 兜底通道：把邮件里的链接复制粘贴进来，直接拆凭证登录
  // （手机上点链接可能被中间页/邮件 App 弄丢凭证，粘贴不受影响）
  var pasteBtn = document.getElementById('pasteBtn');
  if (pasteBtn) {
    pasteBtn.addEventListener('click', function () {
      var pm = document.getElementById('pasteMsg');
      var r = window.miaoLoginByLink
        ? window.miaoLoginByLink(document.getElementById('pasteLink').value)
        : { ok: false, err: '脚本没加载好，刷新一下再试' };
      if (r.ok) {
        pm.textContent = '✅ 登录成功，正在进入～';
        pm.className = 'login-msg ok';
        setTimeout(function () { window.location.replace('index.html'); }, 400);
      } else {
        pm.textContent = '❌ ' + r.err;
        pm.className = 'login-msg err';
      }
    });
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var email = (emailInput.value || '').trim();

    if (!isEmail(email)) {
      setMsg('邮箱格式不对哦～请检查一下', 'err');
      emailInput.focus();
      return;
    }
    if (!cfg.url || !cfg.anonKey) {
      setMsg('还没配置 Supabase（config.js 缺失）', 'err');
      return;
    }

    btn.disabled = true;
    btn.textContent = '发送中…';
    setMsg('', '');

    try {
      // 回跳地址：当前域名下的 index.html（需在 Supabase 后台 Redirect URLs 白名单里）
      var redirectTo = window.location.origin + '/index.html';
      var r = await fetch(cfg.url + '/auth/v1/otp?redirect_to=' + encodeURIComponent(redirectTo), {
        method: 'POST',
        headers: {
          'apikey': cfg.anonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          create_user: true // 邮箱没注册过就自动注册
        })
      });

      // ⚠️ 只看状态码，绝不 r.json()——回应哪怕是乱码也无所谓
      if (r.status === 200) {
        setMsg('✅ 魔法链接已发到「' + email + '」，去邮箱点一下就能登录啦～', 'ok');
        btn.textContent = '✅ 已发送，去查收邮箱';
      } else if (r.status === 429) {
        setMsg('发得太频繁啦，请等 1 分钟再试～', 'err');
        btn.disabled = false;
        btn.textContent = '✨ 发送魔法链接';
      } else {
        setMsg('发送失败（HTTP ' + r.status + '），请稍后再试或告诉我这个数字～', 'err');
        btn.disabled = false;
        btn.textContent = '✨ 发送魔法链接';
      }
    } catch (err) {
      setMsg('发送失败：网络不通（' + (err && err.message ? err.message : err) + '）', 'err');
      btn.disabled = false;
      btn.textContent = '✨ 发送魔法链接';
    }
  });
})();
