// ============================================================
//  喵日常 · 用邮件链接直接登录（兜底通道）v1.1.2
//  场景：手机上点邮件链接可能被腾讯「确定访问」中间页/邮件 App
//  内置浏览器弄丢网址 # 后面的凭证 → 点链接进不去。
//  解法：让用户把链接复制粘贴进来，我们自己从文本里拆出凭证。
//  （implicit 流程的 access_token 是真 JWT，点过一次也不会作废，
//    所以「先点了没进去、再复制粘贴」同样有效）
// ============================================================
(function () {
  'use strict';

  function b64urlDecode(seg) {
    var b = seg.replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    return JSON.parse(atob(b));
  }

  function buildSession(at, rt, expIn) {
    var p = null;
    try { p = b64urlDecode((at || '').split('.')[1] || ''); } catch (e) { p = null; }
    if (!p || !p.sub) return { ok: false, err: '链接里的凭证格式不对（拆不出用户 ID），请确认粘的是完整的链接' };
    if (p.exp && p.exp * 1000 < Date.now()) {
      return { ok: false, err: '这个登录链接已过期了，请回登录页重新发一次' };
    }
    var now = Math.floor(Date.now() / 1000);
    var exp = expIn || 3600;
    var session = {
      provider_token: null,
      access_token: at,
      refresh_token: rt || '',
      token_type: 'bearer',
      expires_in: exp,
      expires_at: p.exp || (now + exp),
      user: {
        id: p.sub,
        email: p.email || '',
        aud: p.aud || '',
        role: p.role || 'authenticated',
        app_metadata: { provider: 'email' },
        user_metadata: {}
      }
    };
    try {
      localStorage.setItem('miao_daily_session', JSON.stringify(session));
      // 顺手按 SDK 格式也写一份，SDK 正常时也能读到
      var cfg = window.SUPABASE_CONFIG || {};
      try {
        var seg = (cfg.anonKey || '').split('.')[1] || '';
        var ref = '';
        try { ref = b64urlDecode(seg).ref || ''; } catch (e) {}
        if (ref) localStorage.setItem('sb-' + ref + '-auth-token', JSON.stringify(session));
      } catch (e) {}
    } catch (e) {}
    return { ok: true, userId: p.sub, email: p.email || '' };
  }

  // 入口：传入用户粘贴的任意文本，尝试从中取出登录凭证
  window.miaoLoginByLink = function (raw) {
    var s = (raw || '').trim();
    if (!s) return { ok: false, err: '还没粘贴链接哦' };

    var at = null, rt = '', expIn = 3600;
    try {
      var hashPart = s.indexOf('#') >= 0 ? s.slice(s.indexOf('#') + 1) : '';
      var queryPart = s.indexOf('?') >= 0 ? s.slice(s.indexOf('?') + 1).split('#')[0] : '';
      var params = new URLSearchParams(hashPart || queryPart || '');
      at = params.get('access_token');
      rt = params.get('refresh_token') || '';
      var ei = parseInt(params.get('expires_in') || '3600', 10);
      if (ei > 0) expIn = ei;
    } catch (e) {}

    // 用户也可能只粘了那一长串 token 本身
    if (!at && /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(s)) at = s;

    if (!at) {
      return { ok: false, err: '粘的内容里没找到登录凭证——请长按邮件里的按钮选「拷贝链接地址」，把整条链接粘过来' };
    }
    return buildSession(at, rt, expIn);
  };

  // 进阶：识别邮件里的 Supabase 验证链接（…supabase.co/auth/v1/verify?token=…&type=…&redirect_to=…），
  // 在当前页面里重新导航去完成验证——302 回跳的 #access_token 会直接出现在地址栏，
  // 由本页 boot() 接住完成登录。全程在本标签页内，不给邮件 App/中间页丢凭证的机会。
  window.miaoFollowVerifyLink = function (raw) {
    var s = (raw || '').trim();
    if (!s) return null;
    var m = s.match(/https?:\/\/[^\s"'<>]*supabase\.co\/auth\/v1\/verify\?[^\s"'<>]*/i);
    if (!m) return null;
    var token = null, type = 'magiclink';
    try {
      var q = m[0].slice(m[0].indexOf('?') + 1);
      var params = new URLSearchParams(q);
      token = params.get('token');
      if (params.get('type')) type = params.get('type');
    } catch (e) { return null; }
    if (!token) return null;
    // 回跳地址固定用当前域名下的 index.html（该域名已在 Supabase 白名单里）
    var target = m[0].slice(0, m[0].indexOf('/auth/')) +
                 '/auth/v1/verify?token=' + encodeURIComponent(token) +
                 '&type=' + encodeURIComponent(type) +
                 '&redirect_to=' + encodeURIComponent(window.location.origin + '/index.html');
    return { navigate: target };
  };
})();
