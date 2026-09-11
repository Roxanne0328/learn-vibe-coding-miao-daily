# UI 设计规范：喵日常 v1.0.0

> 本文档整理自 v1.0.0 已实现的视觉设计，作为后续版本（v1.1 / v1.5 / v2.0）开发的视觉基准。任何新版改动必须先在这里更新设计，再写代码。

---

## 1. 设计哲学

- **温暖治愈**：奶油系手账风，柔和米色底 + 马卡龙色块，无任何锐利边缘。
- **可爱但不幼稚**：表情符号（emoji）+ 圆滚滚 SVG 插画，但保留功能性的清晰度。
- **小确幸感**：每个操作都有微反馈（hover、toast、动效），让用户感到被照顾。
- **少即是多**：宁可不加功能，也不能破坏整体的平静氛围。

## 2. 设计 Token（设计变量）

所有 CSS 自定义属性都定义在 `style.css :root` 中，作为整个产品的"单一真相"。

### 2.1 颜色

#### 主色板
| Token | 色值 | 用途 |
|-------|------|------|
| `--bg-page` | `#FFF8F0` | 页面主背景（奶油米色） |
| `--bg-card` | `#FFFFFF` | 卡片背景 |
| `--bg-glass` | `rgba(255, 255, 255, 0.5)` | 磨砂玻璃卡片背景 |

#### 三色卡片（蓝/粉/橘）
| Token | 色值 | 用途 |
|-------|------|------|
| `--blue` | `#A8C8EC` | 今日待办模块主色 |
| `--blue-deep` | `#7CB0DB` | 待办 hover / 强调 |
| `--pink` | `#F4C2C2` | 习惯打卡模块主色 |
| `--pink-deep` | `#E89B9B` | 习惯 hover / 强调 |
| `--orange` | `#FAD4A3` | 心情日记模块主色 |
| `--orange-deep` | `#E8A672` | 心情 hover / 强调 |

#### 文字色
| Token | 色值 | 用途 |
|-------|------|------|
| `--text-main` | `#5A4A42` | 主文字（标题、重要内容） |
| `--text-soft` | `#9E8E82` | 次文字（描述、辅助） |
| `--text-faint` | `#C7B8AA` | 弱化文字（placeholder、空态） |

#### 状态色
| Token | 色值 | 用途 |
|-------|------|------|
| `--success` | `#8BCA9A` | 完成态（勾选用此色）|
| `--danger` | `#E8A0A0` | 删除按钮 |
| `--warning` | `#FFA07A` | toast 渐变右端 |
| `--warning-light` | `#FFB6C1` | toast 渐变左端 |

### 2.2 字体

| Token | 配置 | 用途 |
|-------|------|------|
| 中文 | `'PingFang SC', 'Microsoft YaHei', sans-serif` | 默认中文 |
| 英文 | `'Nunito', 'Quicksand', sans-serif` | 数字、英文 |
| Google Fonts | `Nunito:wght@400;600;700;800` | 通过 CDN 加载 |

#### 字号层级
| Token | 尺寸 / 行高 | 用途 | 字重 |
|-------|----------|------|------|
| `hero-title` | 34px / 1.2 | 主标题「喵日常」 | 800 |
| `card-title` | 18px / 1.3 | 卡片标题 | 700 |
| `body` | 15px / 1.6 | 正文 | 400 |
| `helper` | 13px / 1.5 | 辅助描述 | 400 |
| `caption` | 12px / 1.4 | footer / 注释 | 400 |
| `emoji-lg` | 24px | 表情按钮（心情区） | — |
| `emoji-md` | 18px | 习惯图标 | — |
| `badge` | 13px / 1 | 右上角数字 badge | 600 |

### 2.3 间距

基于 4px 网格：
| Token | 值 | 用途 |
|-------|----|------|
| `space-1` | 4px | 紧密内距 |
| `space-2` | 8px | 行内元素 |
| `space-3` | 12px | 组件内 |
| `space-4` | 16px | 卡片内 |
| `space-5` | 20px | 卡片内主 |
| `space-6` | 24px | 卡片外距 |
| `space-8` | 32px | 模块间距 |

### 2.4 圆角

| Token | 值 | 用途 |
|-------|----|------|
| `radius-sm` | 8px | 小元素（emoji 选项） |
| `radius-md` | 12px | 输入框、小按钮 |
| `radius-lg` | 16px | 按钮、chip |
| `radius-xl` | 24px | 卡片、toast |
| `radius-full` | 999px | 药丸按钮、badge |

### 2.5 阴影

| Token | CSS 值 | 用途 |
|-------|--------|------|
| `shadow-card` | `0 8px 24px rgba(90, 74, 66, 0.08)` | 默认卡片 |
| `shadow-hover` | `0 12px 36px rgba(90, 74, 66, 0.12)` | hover 抬起 |
| `shadow-toast` | `0 12px 36px rgba(255, 154, 158, 0.35), 0 4px 12px rgba(90, 74, 66, 0.12)` | toast 醒目 |
| `shadow-inset` | `inset 0 2px 0 rgba(255, 255, 255, 0.5)` | 内发光（toast） |

### 2.6 动效

| Token | CSS | 用途 |
|-------|-----|------|
| `transition-fast` | `0.2s ease` | hover / press |
| `transition-med` | `0.3s cubic-bezier(0.4, 0, 0.2, 1)` | 状态变化 |
| `transition-slow` | `0.6s cubic-bezier(0.34, 1.56, 0.64, 1)` | 入场弹性 |

#### 动画曲线
- **普通动效**：`cubic-bezier(0.4, 0, 0.2, 1)`（标准 ease）
- **弹性入场**：`cubic-bezier(0.34, 1.56, 0.64, 1)`（toast、卡片进场）
- **漂浮背景**：`22s` / `26s linear infinite alternate`（背景模糊圆）

#### 关键动画
- `@keyframes float`：背景圆漂浮（上下左右 30px 漂移）
- `@keyframes toastShake`：🥺 emoji 左右摇头
- `@keyframes toastTwinkle`：✨ 闪烁旋转
- `@keyframes cardEnter`：卡片渐入 + 上移

## 3. 全局样式

### 3.1 背景层
```
body {
  background: 4色径向渐变
    radial-gradient(circle at 20% 10%, #FFE8D6 0%, transparent 40%),
    radial-gradient(circle at 80% 30%, #F0E6FF 0%, transparent 50%),
    radial-gradient(circle at 50% 80%, #D6EEFF 0%, transparent 45%),
    #FFF8F0;
}
```
- 两个超大模糊圆（直径 600px，blur 80px）缓慢漂浮
- 装饰元素 `pointer-events: none`，不阻挡点击

### 3.2 页面布局
- **最大宽度**：`max-width: 480px` 居中
- **移动端 padding**：`16px`
- **桌面端 padding**：`40px 24px 80px`
- **底部留白**：`80px`（保证输入时不遮挡）

### 3.3 通用 CSS 类
- `.app`：主内容容器
- `.card`：卡片基础（详见 §4）
- `.btn-primary` / `.btn-ghost`：按钮变体
- `.badge`：右上角徽章

## 4. Hero 区

### 4.1 结构
```
<div class="hero">
  <div class="hero-bar">          ← 右侧按钮位置
  <h1 class="hero-title">          ← 34px 主标题
  <p class="hero-welcome">          ← 副标题
  <div class="hero-illustration">   ← SVG 小猫插画
</div>
```

### 4.2 样式要点
- **背景**：透明，浮在三色渐变之上
- **标题**：渐变色文字（`linear-gradient(135deg, #FFB6C1, #E8A672)` + `-webkit-background-clip: text`）
- **小猫咪插画**：`width: 90px; height: 90px;`，带 6s 缓慢漂浮动画
- 整体 `text-align: center`

### 4.3 入口按钮（hero-bar）
```
.btn-entry {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 13px;
  border: 1.5px dashed rgba(232, 166, 114, 0.4);
}
```

## 5. 卡片样式（`.card`）

### 5.1 基础
```css
.card {
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 24px;
  padding: 22px 24px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow:
    0 8px 24px rgba(90, 74, 66, 0.08),
    inset 0 2px 0 rgba(255, 255, 255, 0.5);
  transition: transform 0.3s, box-shadow 0.3s;
}
```

### 5.2 三色变体
| 类名 | 左边一条强调线 |
|----|----------|
| `.todo-card` | `border-left: 4px solid var(--blue)` |
| `.habit-card` | `border-left: 4px solid var(--pink)` |
| `.mood-card` | `border-left: 4px solid var(--orange)` |
| `.calendar-card` | `border-left: 4px solid var(--orange-deep)` |

### 5.3 卡片标题区（`.card-header`）
- flex 横排列：左侧 title（包含 SVG 图标 + 文字），右侧 badge
- SVG 图标尺寸 18×18，stroke `var(--text-main)`，stroke-width 2.2

### 5.4 交互
- `.card:hover` 不抬起（保持平静）
- **进入动画**：`cardEnter` 0.6s，依次延迟（待办 0s / 习惯 0.1s / 心情 0.2s）

## 6. 组件样式

### 6.1 按钮

#### 主按钮（待办/习惯提交按钮）
- 视觉：chip 样式，**不是显眼的大按钮**，融入卡片
- 待办：`<input>` 整行作为输入区
- 习惯：emoji 选项器 + 文本输入

#### 删除按钮（× 按钮）
```css
.todo-delete, .habit-delete {
  background: transparent;
  border: none;
  color: var(--text-faint);
  opacity: 0;
  transition: opacity 0.2s;
}
.parent:hover .delete { opacity: 0.7; }
.delete:hover { color: var(--danger); opacity: 1; }
```
**规则**：默认不可见，hover 父元素才出现，再 hover 自己变红色。

#### 入口按钮
- 见 §4.3

#### 历史导航按钮
```css
.cal-nav-btn {
  width: 36px; height: 36px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  font-size: 18px;
}
```

### 6.2 输入框

#### Text Input（待办/习惯输入）
```css
.todo-input, .habit-input {
  background: rgba(255, 255, 255, 0.6);
  border: 2px dashed rgba(232, 166, 114, 0.35);
  border-radius: 14px;
  padding: 12px 16px;
  color: var(--text-main);
}
.todo-input::placeholder { color: var(--text-faint); }
.todo-input:focus {
  outline: none;
  border-style: solid;
  border-color: var(--orange);
}
```

#### Textarea（心情日记，只读态）
```css
.mood-input.readonly {
  background: rgba(245, 245, 245, 0.45);
  border-style: solid;
  border-color: rgba(217, 200, 188, 0.4);
  color: var(--text-soft);
  resize: none;
}
```

### 6.3 Checkbox
```css
input[type="checkbox"] {
  appearance: none;
  width: 22px; height: 22px;
  border: 2px solid var(--blue);
  border-radius: 8px;
  cursor: pointer;
}
input[type="checkbox"]:checked {
  background: var(--success);
  border-color: var(--success);
}
input[type="checkbox"]:checked::after {
  content: '✓'; color: white;
  font-size: 14px; line-height: 18px; text-align: center;
  display: block;
}
```

### 6.4 Emoji 选项器（习惯添加区）

**结构**：16 个 emoji，flex-wrap 自然换行成 2 行（每行 8 个）

```css
.emoji-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.emoji-option {
  background: rgba(255, 255, 255, 0.55);
  border: 1.5px solid transparent;
  border-radius: 10px;
  padding: 4px 6px;
  font-size: 18px;
  min-width: 32px;
  min-height: 32px;
}
.emoji-option.is-selected {
  background: rgba(244, 194, 194, 0.5);
  border-color: var(--pink);
}
/* "不选"按钮特殊样式 */
.emoji-option.emoji-none {
  border: 1.5px dashed rgba(217, 200, 188, 0.55);
  color: var(--text-faint);
}
```

### 6.5 心情 Emoji 选择器

**横向滚动**：mobile-friendly

```css
.mood-options {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding: 6px 4px;
}
.mood-btn {
  flex-shrink: 0;
  width: 56px; height: 56px;
  background: rgba(255, 255, 255, 0.5);
  border: 2px solid transparent;
  border-radius: 18px;
  scroll-snap-align: center;
}
.mood-btn.active {
  background: rgba(255, 255, 255, 0.85);
  border: 2px solid var(--orange-deep);
  box-shadow:
    0 0 0 2px rgba(250, 212, 163, 0.5),
    0 4px 12px rgba(232, 166, 114, 0.25);
  transform: scale(1.04);
}
.mood-btn .mood-emoji { font-size: 28px; }
```

### 6.6 Toast 提示气泡

```css
.toast {
  position: fixed;
  top: 36px;
  background: linear-gradient(135deg, #FFB6C1 0%, #FFA07A 100%);
  color: var(--text-main);
  border: 3px solid #fff;
  outline: 2px dashed rgba(255, 154, 158, 0.6);
  outline-offset: -7px;
  border-radius: 24px;
  padding: 14px 22px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow:
    0 12px 36px rgba(255, 154, 158, 0.35),
    0 4px 12px rgba(90, 74, 66, 0.12),
    inset 0 2px 0 rgba(255, 255, 255, 0.5);
  animation: toastShake (🥺) + toastTwinkle (✨);
}
```

### 6.7 Badge（右上角数字徽章）

```css
.badge {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(8px);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
}
```

### 6.8 空态提示

**统一格式**：白底圆角居中块

```css
.todo-empty, .habit-empty-hint, .mood-empty {
  text-align: center;
  padding: 22px 0;
  background: rgba(255, 255, 255, 0.55);
  border-radius: 12px;
  color: var(--text-soft);
  font-size: 13px;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

## 7. 响应式断点

| 断点 | 行为 |
|------|------|
| `≤380px` | padding `16px 12px 80px`，title 26px，猫咪插画 70px |
| `381-768px` | 默认移动端布局 |
| `≥769px` | 居中，最大宽 480px，上下 padding 加大 |

## 8. SVG 插画规范

### 8.1 头部小猫咪
- viewBox `0 0 120 120`
- 圆脸 + 三角耳朵 + 两条胡须 + 小腮红
- 配色：橘白主调 + 粉色腮红
- 路线：`fill: none; stroke: #5A4A42; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round;`
- 实色腮红：`fill: rgba(244, 194, 194, 0.7)`
- 动画：`animation: float 6s ease-in-out infinite alternate`

## 9. 命名约定

- **CSS 类名**：kebab-case（`.todo-card`, `.habit-btn`, `.mood-emoji`）
- **JS 变量**：camelCase（`TodoModule`, `currentDate`, `renderSnapshot`）
- **JS 函数**：动词开头（`renderHabits`, `addHabit`, `getDayDone`）
- **LocalStorage keys**：`miao_daily_<module>`（例如 `miao_daily_todos`）
- **DOM ID**：连字符小写，区分主视图和历史视图用 `Snap` 后缀（如 `todoList` vs `todoListSnap`）

## 10. 验收清单（视觉）

写完代码后，对照此清单逐项验证：

- [ ] 奶油米色背景 + 4 色径向渐变，背景有两个模糊圆漂浮
- [ ] 三个卡片分别是蓝/粉/橘左边一条强调线
- [ ] 卡片有磨砂玻璃效果（半透明白）
- [ ] 顶部有圆滚滚小猫咪插画且轻微浮动
- [ ] 按钮 hover 有反馈，删除按钮默认不可见 hover 才出现
- [ ] 输入框 dashed 边框，focus 变实线 + 橙色
- [ ] mood 选中态是橙色细圈 + 浅光环
- [ ] emoji 选项器 2 行 16 个，「/」是虚线边框
- [ ] toast 是顶部粉橘大气泡带 🥺 摇头 + ✨ 闪烁
- [ ] 空态三个模块统一白底圆角居中
- [ ] 手机宽度 ≤380px 不破版
- [ ] 历史视图所有交互元素全部只读

---

**最后更新**：2026-09-11 v1.0.0
**下一次更新**：v1.1 加入"JSON 导入/导出"按钮时，需为本规范补充 §6.9 按钮样式。
