// ============================================================
//  喵日常 · 初始化 Supabase 客户端
//  依赖：Supabase JS SDK (UMD 全局 supabase) + config.js
// ============================================================
window.supabaseClient = supabase.createClient(
  window.SUPABASE_CONFIG.url,
  window.SUPABASE_CONFIG.anonKey,
  {
    auth: {
      // 用隐式流程：魔法链接的凭证直接带在 URL 里，不依赖"发起请求的那个浏览器"保存的
      // code_verifier。手机上是「在 A 浏览器申请 → 在邮件 App/另一个浏览器点开」，
      // PKCE 会因为取不到 verifier 而登录失败，隐式流程没有这个问题。
      flowType: 'implicit',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
