// ============================================================
//  喵日常 · 初始化 Supabase 客户端
//  依赖：Supabase JS SDK (UMD 全局 supabase) + config.js
// ============================================================
window.supabaseClient = supabase.createClient(
  window.SUPABASE_CONFIG.url,
  window.SUPABASE_CONFIG.anonKey
);
