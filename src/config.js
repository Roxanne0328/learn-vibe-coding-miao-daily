// ============================================================
//  喵日常 · 本地 Supabase 配置（本文件不进 GitHub，已在 .gitignore 忽略）
// ============================================================
//  ⚠️ anonKey 必须是 Supabase 后台 API Keys 页面复制的「anon public」key：
//     完整 JWT，以 eyJ 开头、三段两点、约 400+ 字符。
//     如果浏览器控制台报 "invalid apikey" 或连不上，说明这里的值不对，请替换。
//     获取路径：supabase.com/dashboard → 项目 miao-daily → Project Settings → API → anon public
window.SUPABASE_CONFIG = {
  url: 'https://elvlygokedgbaihbdgrg.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsdmx5Z29rZWRnYmFpaGJkZ3JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMDc5MzksImV4cCI6MjEwNDY4MzkzOX0.iqY8irlOVkOLIfnaMT2sabhuDBTx8pgdbwAxXRKqBgU'
};
