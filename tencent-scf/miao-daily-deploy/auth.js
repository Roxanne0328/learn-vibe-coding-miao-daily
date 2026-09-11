// ============================================================
//  喵日常 · 登录逻辑（邮箱数字验证码）v1.1.3
//  流程：输入邮箱 → 发验证码 → 输入数字 → 验证后直接拿会话进主页
//  为什么改成验证码：点链接登录在手机上会被中间页/邮件 App 弄丢 # 后凭证，
//  验证码完全不依赖跳转，手机电脑体验完全一致。
//  请求都自己 fetch（绕开 SDK，SDK 在手机上会卡死）；
//  云函数修复后返回干净 JSON；万一解析失败有兜底提示引导用粘贴通道。
// ============================================================
(function () {
  'use strict';

  var cfg = window.SUPABASE_CONFIG || {};
  var form = document.getElementById('loginForm');
  var emailInput = document.getElementById('email');
  var msg = document.getElementById('loginMsg');
  var btn = document.getElementById('sendCode');

  // 第二步（验证码）相关元素
  var step2 = document.getElementById('step2');
  var sentTo = document.getElementById('sentTo');
  var codeInput = document.getElementById('otpCode');
  var verifyBtn = document.getElementById('verifyCode');
  var verifyMsg = document.getElementById('verifyMsg');
  var resendBtn = document.getElementById('resendCode');
  var changeEmailBtn = document.getElementById('changeEmail');

  var sentEmail = '';
  var countdownTimer = null;

  function setMsg(text, type) {
    msg.textContent = text || '';
    msg.className = 'login-msg' + (type ? ' ' + type : '');
  }

  function setVerifyMsg(text, type) {
    verifyMsg.textContent = text || '';
    verifyMsg.className = 'login-msg' + (type ? ' ' + type : '');
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
  // （验证码收不到的极端情况；手机上点链接可能被中间页/邮件 App 弄丢凭证，粘贴不受影响）
  var pasteBtn = document.getElementById('pasteBtn');
  if (pasteBtn) {
    pasteBtn.addEventListener('click', function () {
      var pm = document.getElementById('pasteMsg');
      var val = document.getElementById('pasteLink').value;

      // 通道一：链接里直接带凭证 → 本地拆，立即登录
      var r = window.miaoLoginByLink ? window.miaoLoginByLink(val) : null;
      if (r && r.ok) {
        pm.textContent = '✅ 登录成功，正在进入～';
        pm.className = 'login-msg ok';
        setTimeout(function () { window.location.replace('index.html'); }, 400);
        return;
      }
      // 通道二：粘的是 Supabase 验证链接 → 当前页内替用户跳去完成验证
      var v = window.miaoFollowVerifyLink ? window.miaoFollowVerifyLink(val) : null;
      if (v && v.navigate) {
        pm.textContent = '✅ 认出验证链接，正在完成登录，请别离开页面…';
        pm.className = 'login-msg ok';
        setTimeout(function () { window.location.href = v.navigate; }, 300);
        return;
      }
      pm.textContent = '❌ ' + ((r && r.err) || '没认出这条链接，请确认粘的是邮件里的完整链接');
      pm.className = 'login-msg err';
    });
  }

  /* ===== 第一步：发送验证码 ===== */

  async function sendCode(email) {
    btn.disabled = true;
    btn.textContent = '发送中…';
    setMsg('', '');
    try {
      // 不带 redirect_to：验证码流程不需要跳转（邮件模板里也不该再放链接）
      var r = await fetch(cfg.url + '/auth/v1/otp', {
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
      if (r.status === 200) {
        sentEmail = email;
        showStep2(email);
        startCountdown(60);
      } else if (r.status === 429) {
        setMsg('发得太频繁啦，请等 1 分钟再试～', 'err');
        resetSendBtn();
      } else {
        setMsg('发送失败（HTTP ' + r.status + '），请稍后再试或告诉我这个数字～', 'err');
        resetSendBtn();
      }
    } catch (err) {
      setMsg('发送失败：网络不通（' + (err && err.message ? err.message : err) + '）', 'err');
      resetSendBtn();
    }
  }

  function resetSendBtn() {
    btn.disabled = false;
    btn.textContent = '📩 发送验证码';
  }

  function showStep2(email) {
    if (sentTo) sentTo.textContent = email;
    if (step2) step2.style.display = '';
    if (codeInput) {
      codeInput.value = '';
      setTimeout(function () { codeInput.focus(); }, 100);
    }
    setVerifyMsg('', '');
  }

  function hideStep2() {
    if (step2) step2.style.display = 'none';
    setVerifyMsg('', '');
  }

  function startCountdown(sec) {
    if (countdownTimer) clearInterval(countdownTimer);
    if (!resendBtn) return;
    var left = sec;
    resendBtn.disabled = true;
    resendBtn.textContent = '重新发送（' + left + 's）';
    countdownTimer = setInterval(function () {
      left -= 1;
      if (left <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        resendBtn.disabled = false;
        resendBtn.textContent = '重新发送';
      } else {
        resendBtn.textContent = '重新发送（' + left + 's）';
      }
    }, 1000);
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
    await sendCode(email);
  });

  if (resendBtn) {
    resendBtn.addEventListener('click', function () {
      if (resendBtn.disabled || !sentEmail) return;
      sendCode(sentEmail);
    });
  }

  if (changeEmailBtn) {
    changeEmailBtn.addEventListener('click', function () {
      sentEmail = '';
      hideStep2();
      resetSendBtn();
      setMsg('', '');
      if (emailInput) { emailInput.focus(); emailInput.select(); }
    });
  }

  /* ===== 第二步：验证 6 位验证码，直接换会话 ===== */

  function saveSessionAndGo(data) {
    // data: { access_token, refresh_token, token_type, expires_in, user: {...} }
    var now = Math.floor(Date.now() / 1000);
    var session = {
      provider_token: null,
      access_token: data.access_token,
      refresh_token: data.refresh_token || '',
      token_type: data.token_type || 'bearer',
      expires_in: data.expires_in || 3600,
      expires_at: (data.expires_at || (now + (data.expires_in || 3600))),
      user: data.user
    };
    try { localStorage.setItem('miao_daily_session', JSON.stringify(session)); } catch (e) {}
    setVerifyMsg('✅ 登录成功，正在进入～', 'ok');
    setTimeout(function () { window.location.replace('index.html'); }, 400);
  }

  // 请求验证接口。type 先用 'magiclink'（GoTrue 标准类型），
  // 万一这个 Supabase 版本只认 'email'（supabase-js 文档写法），自动换着再试一次
  async function tryVerify(type, code) {
    var r = await fetch(cfg.url + '/auth/v1/verify', {
      method: 'POST',
      headers: {
        'apikey': cfg.anonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ type: type, token: code, email: sentEmail })
    });
    var text = '';
    try { text = await r.text(); } catch (e) {}
    var data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
    return { status: r.status, data: data, raw: text };
  }

  async function verifyCode() {
    var code = (codeInput.value || '').trim();
    if (!sentEmail) {
      setVerifyMsg('请先输入邮箱发送验证码～', 'err');
      return;
    }
    if (!/^\d{4,10}$/.test(code)) {
      setVerifyMsg('验证码是邮件里的那串数字哦～', 'err');
      codeInput.focus();
      return;
    }
    if (verifyBtn) { verifyBtn.disabled = true; verifyBtn.textContent = '验证中…'; }
    setVerifyMsg('', '');

    try {
      var res = await tryVerify('magiclink', code);
      // magiclink 不被接受（报 type 相关错误）→ 换 'email' 再试
      if (res.status === 400 && res.data && /type/i.test(String(res.data.msg || res.data.error || ''))) {
        res = await tryVerify('email', code);
      }

      if (res.status >= 200 && res.status < 300 && res.data && res.data.access_token && res.data.user) {
        saveSessionAndGo(res.data);
        return;
      }

      if (res.status === 400 || res.status === 403) {
        setVerifyMsg('验证码不对或已过期，检查一下数字～（10 分钟内有效）', 'err');
      } else if (res.status === 429) {
        setVerifyMsg('试得太频繁啦，请等 1 分钟再试～', 'err');
      } else if (!res.data && res.status >= 200 && res.status < 300) {
        // 状态码成功但内容解析不出来（理论上云函数修复后不会发生）
        setVerifyMsg('登录完成但数据异常，请展开下方「用链接登录」试试粘贴通道～', 'err');
      } else {
        setVerifyMsg('验证失败（HTTP ' + res.status + '），告诉我这个数字～', 'err');
      }
    } catch (err) {
      setVerifyMsg('网络不通（' + (err && err.message ? err.message : err) + '），稍后再试～', 'err');
    }
    if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.textContent = '✅ 登录'; }
  }

  if (verifyBtn) verifyBtn.addEventListener('click', verifyCode);
  if (codeInput) {
    codeInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); verifyCode(); }
    });
    // 只留数字（Supabase 生成的验证码长度不定，实测 8 位，放宽到 4~10 位通吃）
    codeInput.addEventListener('input', function () {
      codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 10);
    });
  }
})();
