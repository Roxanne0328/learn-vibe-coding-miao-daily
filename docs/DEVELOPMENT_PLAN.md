# 开发计划：喵日常 v1.0.0

> 本文档是 v1.0.0 的**实施倒推**：把已经做出来的功能拆分成"按步骤执行也能做出来"的清单。每一步都独立可验证，完成后整体就达成 v1.0.0。
>
> 后续每个新对话 / 新 AI 接手这个项目时，按这个计划逐步执行即可。

---

## 0. 元信息

- **目标版本**：v1.0.0 MVP
- **总步骤数**：8 步（按顺序必须串行）
- **预计交付**：单 HTML + CSS + JS 三文件，无构建工具
- **前置依赖**：无（不依赖任何外部服务）
- **配套文档**：
  - `docs/PRD.md` — 需求与功能清单
  - `docs/UI_DESIGN_SPEC.md` — 视觉规范
  - `CHANGELOG.md` — 版本变更记录
  - `README.md` — 项目说明（用户在 GitHub 上看到的"首页"）

---

## 1. 项目骨架 + Git 初始化

### 目标
搭建目录结构、空 HTML/CSS/JS 文件、`.gitignore`，完成第一次 git commit。

### 涉及文件
- `miao-daily/`
  - `src/index.html`（空骨架）
  - `src/style.css`（空，`:root` token）
  - `src/app.js`（IIFE 包裹的空函数）
  - `docs/PRD.md`（已经存在的第一版 PRD）
  - `.gitignore`
  - `README.md`

### 关键内容

**`src/index.html`** 骨架：
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>喵日常</title>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="app" id="app">
    <!-- 后面填充卡片 -->
  </main>
  <script src="app.js"></script>
</body>
</html>
```

**`src/style.css`** 初始化 token：
```css
:root {
  --bg-page: #FFF8F0;
  --text-main: #5A4A42;
  --text-soft: #9E8E82;
  --text-faint: #C7B8AA;
  --blue: #A8C8EC;
  --blue-deep: #7CB0DB;
  --pink: #F4C2C2;
  --pink-deep: #E89B9B;
  --orange: #FAD4A3;
  --orange-deep: #E8A672;
  --success: #8BCA9A;
  --danger: #E8A0A0;
}
body {
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: var(--bg-page);
  margin: 0;
  min-height: 100vh;
  color: var(--text-main);
}
```

**`src/app.js`** IIFE：
```js
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function init() { /* 占位 */ }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

**`.gitignore`**：
```
.DS_Store
.vscode/
.idea/
*.log
.env*
.workbuddy/  ← 用户私有 memory，不进仓
```

### 完成标准
- [ ] 三个文件存在且互相关联（HTML 引 CSS 和 JS）
- [ ] 浏览器打开 `src/index.html` 看到奶油米色背景
- [ ] `git init` 完成，第一次 commit `"chore: 项目初始化"`

### 自检要点
- 字体加载优先级（中文 vs 英文）
- `viewport meta` 必须有（移动端响应）

---

## 2. Hero 区 + 卡片基础样式（静态视觉）

### 目标
画出 hero 欢迎区（标题 + 副标题 + 小猫插画）和卡片基础样式（磨砂玻璃 + 三色染色）。

### 涉及文件
- `src/index.html`（加 hero + 3 个空卡片占位）
- `src/style.css`（加 hero / card / 背景浮动圆）

### 关键内容
- HTML 三个 `<section class="card todo-card">` / `habit-card` / `mood-card` 暂留标题区，主体留空
- Hero 包含：渐变背景文字标题"喵日常"、副标题"今天也要好好生活呀～"、手绘 SVG 小猫
- 背景：4 色径向渐变 + 两个超大模糊圆（22s/26s 漂浮动画）
- 卡片：白磨砂玻璃（`backdrop-filter: blur(24px)`），左边 4px 三色强调线，圆角 24px

### 完成标准
- [ ] 浏览器看到 4 色渐变背景 + 两个模糊圆漂浮
- [ ] Hero 标题渐变色，SVG 小猫可见且浮动
- [ ] 三张卡片存在，互相之间间距一致
- [ ] 移动端宽度不溢出

### 自检要点
- `-webkit-backdrop-filter` Safari 兼容
- 卡片背景透明而不是纯白（保留磨砂效果）

---

## 3. 今日待办模块（功能）

### 目标
完成 todos 模块的增 / 删 / 改 / 查 / 持久化。

### 涉及文件
- `src/index.html`（待办卡片内容）
- `src/style.css`（`.todo-item`, `.todo-input`, `.todo-delete`, `.badge` 样式）
- `src/app.js`（`TodoModule` 对象）

### 关键实现
- 数据结构：`{ "YYYY-MM-DD": [{ id, text, completed }] }`
- LocalStorage key：`miao_daily_todos`
- 默认首次数据：`todayStr()` 上挂 3 条示例（"回复重要邮件"、"整理书桌"、"喝一杯水"）
- 事件绑定：`submit` 添加、`click` 切换 / 删除

### 完成标准
- [ ] 输入框 + 回车添加任务，立刻出现
- [ ] checkbox 点击立即划线（`.label.done` 加删除线）
- [ ] hover 显示 × 按钮，点击删除
- [ ] badge 实时显示 `已完成 / 总数`
- [ ] 刷新页面所有数据保留

### 自检要点
- 兼容旧数据格式：第一次访问存的是数组，第二次访问是对象（migration 逻辑）
- 列表加 `max-height: 220px; overflow-y: auto` 内部滚动

---

## 4. 习惯打卡模块（功能）

### 目标
完成 habits 列表展示 / 打卡 / 自定义新增 / emoji 选择器 / 删除。

### 涉及文件
- `src/index.html`（习惯卡片 + emoji 选择器 + 输入框）
- `src/style.css`（`.habit-btn`, `.emoji-picker`, `.habit-grid` 样式）
- `src/app.js`（`HabitModule` 对象）

### 关键实现
- 数据结构：
  - `miao_daily_habit_list`：全局 list `[{ id, name, emoji }]`
  - `miao_daily_habit_records`：按天 `{ "YYYY-MM-DD": [habitId,...] }`
- 默认 4 个习惯（💧 喝水 / 📖 阅读 / 🛌 早睡 / 🏃 运动）
- emoji 选项器：12-16 个常用 emoji + 「/」不选按钮（自动给 ⭐）
- `getDayDone` 必须过滤掉已删除习惯的孤立 id

### 完成标准
- [ ] 4 个默认习惯可见
- [ ] 点击习惯立即勾选（粉色填充）
- [ ] 输入新习惯 + 回车，加入列表
- [ ] emoji 选择器 2 行布局（含「/」不选）
- [ ] hover 习惯显示 × 删除按钮，点击真的删除
- [ ] badge 显示正确数字（不会因删除而虚高）

### 自检要点
- 嵌套 button 不可用：删除按钮用 `<span>` 而非 `<button>`
- emoji 选择器「/」必须用 `data-emoji="__none__"` 标记

---

## 5. 心情日记模块（功能）

### 目标
完成 10 emoji 横滑选择 + 一句话日记 + 按天持久化。

### 涉及文件
- `src/index.html`（心情卡片 + emoji 横滑 + textarea）
- `src/style.css`（`.mood-btn`, `.mood-options`, `.mood-input`）
- `src/app.js`（`MoodModule` 对象）

### 关键实现
- 10 个 emoji 数组：`happy/calm/tired/sad/excited` 5 个 + `angry/anxious/cool/party/think` 5 个
- `.mood-options` 用 flex + `overflow-x: auto` + `scroll-snap-type: x mandatory` 实现横滑
- 点击同一 emoji 取消选择（`current === mood ? null : mood`）
- textarea 400ms 节流保存
- 注意：HTML 里只能有一个 `#moodNote`，防止重复

### 完成标准
- [ ] 10 个 emoji 横滑可见，手机可滑动对齐
- [ ] 选中态：橙色细圈 + scale 1.04
- [ ] emoji 和 textarea 各自独立保存（不互相依赖）
- [ ] 刷新页面心情日记不丢失

### 自检要点
- 启动时 `dedupMoodNote()` 防重
- `escapeHtml()` 用于 textarea value（虽然通常安全但养成习惯）

---

## 6. 去重保护 + Toast 提示

### 目标
加重复检测和醒目 toast 反馈。

### 涉及文件
- `src/app.js`（`showToast` 函数 + `TodoModule.add` / `HabitModule.addHabit` 去重）
- `src/style.css`（`.toast` 样式 + `@keyframes toastShake/toastTwinkle`）

### 关键实现
- `showToast(message)`：自动移除旧 toast，2.8s 后淡出
- 待办去重：`list.some(t => t.text.trim() === trimmed)` 判断
- 习惯去重：`this.habits.some(h => h.name.trim() === trimmed)` 判断
- toast 内容：`"哎呀，已经有「xxx」啦～ 别重复啦 🥺"`
- toast DOM：`<span class="toast-icon">🥺</span><span class="toast-text">...</span><span class="toast-sparkle">✨</span>`

### 完成标准
- [ ] 待办里输入重复项，弹出顶部粉橘大气泡
- [ ] 习惯里输入重复项，同款 toast
- [ ] toast 2.8 秒后淡出，不影响操作
- [ ] 重复项不会被创建（数量不变）

### 自检要点
- toast 用 `position: fixed; z-index: 1000; pointer-events: none;` 不阻挡点击
- 用 `escapeHtml()` 防止用户输入的恶意符号

---

## 7. 看历史视图（超出 MVP 的彩蛋）

### 目标
加入"看历史"入口，默认看昨天，日历可折叠选择，今天不可选，历史只读。

### 涉及文件
- `src/index.html`（主视图加 `📅 看历史` 按钮 + 历史视图容器）
- `src/style.css`（日历、历史快照空态样式）
- `src/app.js`（`Calendar`, `ViewController`, 三个模块的 `renderSnapshot`）

### 关键实现
- todos 数据已按日期分组，habit/mood 也按日期存，**刚好直接复用**
- 主视图顶部 `<button id="openHistory">` 入口
- 历史视图容器 `<div id="historyView" style="display: none;">`
- 进入历史：`currentDate = yesterdayStr()`（不能选今天）
- 日历：周一开头，每月 6×7 网格，今天日期标"今天"+ 灰显 + 不可点
- 历史模式下三种只读：表单 display:none / checkbox disabled / textarea disabled
- 三个模块的 `renderSnapshot` 方法分别用 `_snap` 后缀的元素 id

### 完成标准
- [ ] 点 📅 看历史按钮进入历史视图
- [ ] 默认打开昨天，日历今天不可点
- [ ] 选任意过去日期，下面三个模块只读显示
- [ ] 待办 / 习惯 / 心情空态格式统一（白底圆角居中）
- [ ] 「← 回到今天」按钮有效
- [ ] 日历卡可折叠/展开

### 自检要点
- 避免 ID 冲突：主视图用 `todoList`，历史视图用 `todoListSnap`
- 历史视图心情没有记录时**不显示 emoji 选择器**，只显示提示
- `dedupMoodNote()` 在 init 时跑，防止历史视图复制出的 textarea 干扰主视图

---

## 8. 细节优化 + 视觉打磨

### 目标
完成所有迭代反馈：内部滚动 / emoji 倒退回 / 选中态优化 / 空态统一 / 高度对齐。

### 涉及文件
- 三个文件均涉及，主要是微调

### 已完成的微调项
- v0.3：待办框 / 习惯框内部滚动
- v0.4：SVG 图标倒退回 emoji
- v0.5：emoji 选择器扩到 16 个（两行 8×2）
- v0.5.1：心情 emoji 加到 10 个
- v0.5.2：「/」按钮 + 心情选中态圆环细化
- v0.6.x：空态高度统一、颜色统一、badge 数字规则

### 完成标准
- [ ] 待办列表 220px max-height，超出滚动
- [ ] 习惯列表 220px max-height，超出滚动
- [ ] 三个模块空态高度一致（min-height 60px 居中）
- [ ] 三个空态文字颜色统一
- [ ] 「不选」按钮显示 `/` 而非 `—`
- [ ] 习惯去重 toast 提示醒目
- [ ] 习惯 badge 在删除时不会虚高

---

## 9. 发布前准备（CHANGELOG + README + Tag）

### 目标
写完整文档，给本次开发画句号。

### 涉及文件
- `CHANGELOG.md`（v1.0.0 发布说明 + v0.1-v0.7 迭代记忆）
- `README.md`（项目说明，给 GitHub 访客看）
- `docs/PRD.md`（更新为 V1.0.0 已达成状态）
- git tag `v1.0.0`

### `README.md` 模板
```markdown
# 喵日常 🐾

咪咪大人的日常计划网页 - 待办 / 习惯 / 心情 + 历史快照

## 用法
打开 `src/index.html` 即可使用。

## 功能
- 📝 今日待办
- ✨ 习惯打卡
- 💛 今日心情
- 📅 看历史

## 技术栈
纯前端 HTML + CSS + JS + LocalStorage，无构建工具。

## License
MIT
```

### Tag 命令
```bash
git tag -a v1.0.0 -m "v1.0.0 MVP 正式达成"
```

### 完成标准
- [ ] README 在 GitHub 上能正常渲染
- [ ] CHANGELOG 包含 v0.1-v1.0.0 完整记录
- [ ] PRD 标记"v1.0.0 已达成"
- [ ] git tag v1.0.0 存在

---

## 10. 技术栈纵览

### 文件清单
| 文件 | 作用 | 大约行数 |
|------|------|----------|
| `src/index.html` | 页面结构 | 200 |
| `src/style.css` | 样式 + 动画 | 700 |
| `src/app.js` | 交互逻辑 | 1100 |
| `docs/PRD.md` | 需求文档 | 200 |
| `docs/UI_DESIGN_SPEC.md` | 视觉规范 | 600 |
| `docs/DEVELOPMENT_PLAN.md` | 开发计划 | 本文件 |
| `CHANGELOG.md` | 更新日志 | 80 |
| `README.md` | 项目说明 | 30 |

### 技术决策
- **无前端框架**：React / Vue 不需要，单页 + 1100 行 JS 完全可控，避免工具链复杂度
- **无构建工具**：直跑 HTML/CSS/JS，浏览器或本地 http server 启动即可
- **无 CSS 框架**：手写 CSS + 自定义属性（design tokens），保持纯净
- **LocalStorage 优先**：v1.0.0 故意不用云端，先实现 + 验证体验

### 浏览器兼容性
- **支持**：Safari 14+、Chrome 90+、Edge 90+、iOS Safari 14+
- **依赖**：CSS `backdrop-filter`（Safari 需要 `-webkit-backdrop-filter` 前缀）

### 部署方式（v1.0.0 之后）
- **首选**：Vercel（GitHub 自动同步，免费，自动 HTTPS）
  - 步骤：登录 Vercel → Import Git Repository → 选择 `learn-vibe-coding-miao-daily` → Deploy
  - 几分钟拿到 `*.vercel.app` 分享链接
- **备选**：GitHub Pages
  - Settings → Pages → Source 选 `main` 分支 → 保存
  - 拿到 `https://<username>.github.io/<repo>/` 链接
- **本地预览**：
  ```bash
  cd src/ && python3 -m http.server 8000
  # 然后浏览器打开 http://localhost:8000
  ```

### 后续版本规划
| 版本 | 主要内容 |
|------|---------|
| v1.0.1 | GitHub push + Vercel 部署 + 分享链接 |
| **v1.1.0** | **Supabase + 邮箱魔法链接登录 + 跨设备同步（本次）** |
| v1.2 | JSON 导入/导出（数据备份） |
| v1.5 | 周/月视图、习惯连续天数、自定义编辑 |
| v2.0 | 预留：更大的功能演进（如好友协作、分享等） |

---

## 11. v1.1.0 云端登录同步版开发计划

### 目标
把数据存储从 LocalStorage 迁移到 Supabase 云端，加邮箱魔法链接登录，实现跨设备同步。

### 涉及文件
- `src/login.html` / `src/style.login.css` — 登录页（静态原型已完成，本阶段加 JS）
- `src/supabase.js` — Supabase 客户端初始化
- `src/auth.js` — 发送魔法链接 / 回调登录 / 退出
- `src/app.js` — 数据层从 LocalStorage 改为 Supabase（保留 LocalStorage 作离线缓存）
- `src/config.js` — 本地注入 `SUPABASE_URL` + `ANON_KEY`（**已被 .gitignore，不进仓**）
- `supabase/migrations/001_initial_schema.sql` — 4 张表 + RLS 行级安全（已写好）
- `docs/PRD.v1.1.md` / `docs/UI_DESIGN_SPEC.v1.1.md` — 需求与视觉

### 步骤（串行）
1. **接 Supabase 客户端**：`supabase.js` 用 `@supabase/supabase-js`（CDN 引入）初始化 `createClient(URL, ANON_KEY)`；URL 和 key 从 `window.SUPABASE_CONFIG`（由本地 `config.js` 注入，绝不硬编码进仓库文件）。
2. **登录页接逻辑**：`auth.js` 绑定「发送魔法链接」按钮 → `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })` → 提示「去邮箱点链接」。
3. **回调登录态**：监听 `supabase.auth.onAuthStateChange`，已登录则隐藏登录页、显示主页面；未登录显示登录页。
4. **退出登录**：主页面右上角加「退出」按钮 → `supabase.auth.signOut()`。
5. **数据层改写**：`app.js` 里读取/写入改为 Supabase（每条带 `user_id`）；保留 LocalStorage 作离线缓存。
6. **一次性导入提示**：登录成功后若 LocalStorage 有旧数据 → 顶部黄色提示条「检测到你有 N 条本地数据，是否导入？」→ 点导入搬到云端 → 提示消失。
7. **跨设备测试**：A 设备加待办 → B 设备登录查看是否同步；离线写排队、恢复网络后上传。

### 完成标准
- [ ] 第一次输邮箱 → 收邮件 → 点链接 → 登录成功
- [ ] 退出按钮可点 → 回登录页
- [ ] 再登录同一邮箱 → 数据都在
- [ ] 加待办 → 刷新页面 → 还在
- [ ] A 设备加待办 → B 设备能看到
- [ ] v1.0 时代 LocalStorage 数据登录后一键迁移到云端

### 自检要点
- **密钥安全**：anon key 虽可公开，但仍走本地 `config.js` 注入，不硬编码进 `app.js`；`.env` 已被 gitignore。
- **RLS 隔离**：确认每张表有 `user_id = auth.uid()` 策略，朋友之间数据不可见。
- **Supabase 后台还需配置**：Enable Email Auth + 设置 Site URL / Redirect URLs（部署后填 Vercel 域名）。

---

## 自检总览（v1.0.0 发布前）

每一步完成后对照 PRD §9 验收清单（共 11 项）逐项打勾。**全部 ✅ 后才能打 v1.0.0 tag**。

特别提示：
- 步骤 6（去重）和步骤 7（历史）是最容易出 bug 的部分，**必须手机端 + 电脑端各测一遍**
- 步骤 4 / 5 / 6 完成后，**清除浏览器 LocalStorage 再测一次**，确认默认数据能正确初始化

---

**最后更新**：2026-09-11
**适用范围**：从空目录到 v1.0.0 tag 打出来的完整 8 步 + 发布收尾
