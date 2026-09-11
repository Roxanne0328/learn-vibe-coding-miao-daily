// ============================================================
//  喵日常 · 登录逻辑（邮箱魔法链接）
//  步骤：发送魔法链接 → 监听登录态 → 登录成功跳主页
// ============================================================
(function () {
  'use strict';

  var client = window.supabaseClient;
  var form = document.getElementById('loginForm');
  var emailInput = document.getElementById('email');
  var emailError = document.getElementById('emailError');
  var msg = document.getElementById('loginMsg');
  var btn = document.getElementById('sendMagicLink');

  // 显示状态提示：type 为 '' | 'ok' | 'err'
  function setMsg(text, type) {
    msg.textContent = text || '';
    msg.className = 'login-msg' + (type ? ' ' + type : '');
  }

  // 简单的邮箱格式校验
  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var email = (emailInput.value || '').trim();

    if (!isEmail(email)) {
      setMsg('邮箱格式不对哦～请检查一下', 'err');
      emailInput.focus();
      return;
    }

    btn.disabled = true;
    btn.textContent = '发送中…';
    setMsg('', '');

    try {
      var { error } = await client.auth.signInWithOtp({
        email: email,
        options: {
          // 点邮件链接后跳回主页；本地是 http://localhost:8000，上线后自动用域名
          emailRedirectTo: window.location.origin + '/index.html'
        }
      });
      if (error) throw error;
      setMsg('✅ 魔法链接已发到「' + email + '」，去邮箱点一下就能登录啦～', 'ok');
      btn.textContent = '✅ 已发送，去查收邮箱';
    } catch (err) {
      setMsg('发送失败：' + (err && err.message ? err.message : err), 'err');
      btn.disabled = false;
      btn.textContent = '✨ 发送魔法链接';
    }
  });

  // 监听登录态：点邮件里的魔法链接回来后，自动识别已登录并跳主页
  client.auth.onAuthStateChange(function (event, session) {
    if (event === 'SIGNED_IN' && session) {
      window.location.href = 'index.html';
    }
  });

  // 打开登录页时若已有 session（比如之前登录过没退出），直接进主页
  client.auth.getSession().then(function (res) {
    if (res && res.data && res.data.session) {
      window.location.href = 'index.html';
    }
  });
})();
