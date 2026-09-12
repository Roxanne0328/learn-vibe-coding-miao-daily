# 喵日常 🐾

咪咪大人的第一个 vibe coding 项目 —— 一个温暖治愈的日常计划网页。

> 当前版本：**v1.1.4**（2026-09-12）
> 在线地址：https://miao-daily-miao-daily-d1gmyiugua09ec60d.webapps.tcloudbase.com

## 功能

- 📝 **今日待办** - 添加任务、勾选完成、编辑、删除、未完成自动置顶
- ✨ **习惯打卡** - 4 个默认习惯 + 任意自定义 + emoji 选择器
- 💛 **今日心情** - 10 个 emoji 横滑 + 一句话日记
- 📅 **看历史** - 日历选择过去任意日期查看（全部只读）
- 📮 **邮箱验证码登录**（v1.1.3+）- 填邮箱 → 收数字验证码 → 填码登录，首次即自动注册
- ☁️ **跨设备同步**（v1.1.0+）- 数据存云端，换设备登录同一邮箱即可看到

## 怎么用

手机电脑同一套流程：

1. 打开[登录页](https://miao-daily-miao-daily-d1gmyiugua09ec60d.webapps.tcloudbase.com/login.html)
2. 填邮箱 → 点「📩 发送验证码」
3. 去邮箱查收新邮件 → 把里面的数字验证码填进来
4. 点「✅ 登录」→ 进主界面

> ⚠️ 前置条件：Supabase 后台 → Authentication → Email Templates → Magic Link 模板需配置为含 `{{ .Token }}` 的验证码文案（已配置）。

## 技术栈

- **前端**：原生 HTML + CSS + JavaScript，**零构建工具**
- **样式**：CSS 自定义属性 + 磨砂玻璃（`backdrop-filter`）+ 漂浮背景动画
- **后端即服务**：Supabase（Auth 魔法链接 + PostgreSQL + RLS 行级安全，数据按账号隔离）
- **本地缓存**：LocalStorage（离线可用 + 800ms 防抖上传云端）
- **部署**：腾讯云 CloudBase 静态托管 + SCF 云函数 `supabase-proxy`（转发 Supabase 请求）
- **SDK**：自托管 `@supabase/supabase-js@2`（`src/vendor/`，不走 CDN，国内可直接加载）

## 项目结构

```
├── src/                      # 部署到线上的全部静态文件
│   ├── index.html            # 主页面
│   ├── login.html            # 登录页
│   ├── app.js                # 主逻辑（登录、待办、习惯、心情、历史、云同步）
│   ├── auth.js               # 登录页逻辑（发送魔法链接）
│   ├── linklogin.js          # 「粘贴链接登录」兜底通道（v1.1.2 新增）
│   ├── config.js             # Supabase 地址与公开 key
│   ├── supabase.js           # SDK 初始化（implicit 流程）
│   ├── style.css / style.login.css
│   └── vendor/supabase-js.js # 自托管 SDK
├── tencent-scf/
│   ├── supabase-proxy/       # 云函数源码（纯转发）
│   └── miao-daily-deploy/    # 待上传的静态文件副本
├── supabase/                 # 建表 SQL
├── docs/                     # PRD / UI 规范 / 开发计划 / 部署排障手册
└── CHANGELOG.md
```

## 本地预览

```bash
cd src/ && python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

> 不建议直接双击 `index.html` 打开（`file://` 协议下 LocalStorage 和登录回调可能受限）。

## 部署

静态文件改完，到 CloudBase 控制台「静态网站托管 → 文件管理」覆盖上传即可。
⚠️ 记得同步升级 `index.html` / `login.html` 里的 `?v=N` 版本号，否则移动端缓存会让改动看起来没生效。

详细流程和排障手册见 [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)。

## 文档

| 文档 | 内容 |
|------|------|
| `CHANGELOG.md` | 版本更新日志（从 v0.1 到 v1.1.2 的完整成长记录） |
| `docs/DEPLOYMENT.md` | **部署流程 + 6 个线上坑的排障手册**（v1.1.2 实战存档） |
| `docs/PRD.md` | 产品需求文档（v1.0） |
| `docs/PRD.v1.1.md` | 云端登录同步版需求 |
| `docs/UI_DESIGN_SPEC.md` | UI 设计规范 |
| `docs/DEVELOPMENT_PLAN.md` | 分步开发计划 |

## 开发方式

Vibe coding — AI 结对编程。流程：拷问需求 → PRD → 静态原型 → UI 规范 → 开发计划 → 小步写代码。

## License

MIT
