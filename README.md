# 喵日常 🐾

咪咪大人的第一个 vibe coding 项目 - 一个温暖治愈的日常计划网页。

## 功能

- 📝 **今日待办** - 添加任务、勾选完成、删除、滚动
- ✨ **习惯打卡** - 4 个默认习惯 + 任意自定义 + emoji 选择器
- 💛 **今日心情** - 10 个 emoji 横滑 + 一句话日记
- 📅 **看历史** - 日历选择过去任意日期查看（全部只读）

## 截图（开发中）

打开 `src/index.html` 即可在浏览器看到。

## 技术栈

- **HTML5** + **CSS3**（自定义属性 + 磨砂玻璃 + 动画）
- **原生 JavaScript**（无框架）
- **LocalStorage** 持久化
- **零构建工具**：直跑三文件

## 本地预览

```bash
cd src/ && python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

或直接双击 `src/index.html`（部分浏览器可能因 CORS 限制不允许 LocalStorage）。

## 部署

部署到 Vercel：

1. 把这个仓库连接到 Vercel
2. 框架选 "Other"
3. 源码目录留空
4. Deploy

几分钟后拿到 `*.vercel.app` 链接。

## 数据存储说明

**v1.0.0**：数据存在用户自己的浏览器 LocalStorage，跨设备不共享。
**v2.0**：计划接入 Supabase 实现云端同步。

## 文档

- `docs/PRD.md` — 产品需求文档
- `docs/UI_DESIGN_SPEC.md` — UI 设计规范
- `docs/DEVELOPMENT_PLAN.md` — 开发步骤
- `CHANGELOG.md` — 版本更新日志

## 开发方式

Vibe coding - AI 结对编程。流程：拷问需求 → PRD → 静态原型 → UI 规范 → 开发计划 → 小步写代码。

## License

MIT
