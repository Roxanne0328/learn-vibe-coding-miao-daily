# UI 设计规范：喵日常 v1.1.0 登录页

> 本文档整理 v1.1.0 新增的**登录页**视觉设计，基于已咪咪大人确认的静态原型（`src/login.html` + `src/style.login.css`）。
> v1.0 全局规范（主页面三卡片、Hero、Toast 等）见 `UI_DESIGN_SPEC.md`，本规范只补充登录页专属部分。
> 任何后续登录页改动必须先更新本规范，再写代码。

---

## 1. 设计哲学（沿用 v1.0）

- **温暖治愈**：奶油米色底 + 马卡龙色块，无锐利边缘。
- **可爱但不幼稚**：emoji + 圆滚滚小猫插画，但保留功能性清晰。
- **小确幸感**：每个操作有微反馈（hover、动效）。
- **少即是多**：登录页比主页面更聚焦、更简洁，不堆功能。

登录页是**新页面、独立文件**（`src/login.html` + `src/style.login.css`），不污染主页面的 `style.css`。

---

## 2. 设计 Token

### 2.1 复用 v1.0 的 Token（单一真相来源仍是 `style.css :root`）

| Token | 色值 | 登录页用途 |
|-------|------|-----------|
| `--bg-page` | `#FFF8F0` | 页面底色（与 v1.0 完全一致） |
| `--bg-glass` | `rgba(255, 255, 255, 0.55)` | 登录卡片磨砂玻璃底 |
| `--orange` | `#FAD4A3` | 输入框 focus 边框 |
| `--orange-deep` | `#E8A672` | 输入框校验通过边框 |
| `--text-main` | `#5A4A42` | 主文字、输入文字 |
| `--text-soft` | `#9E8E82` | 副标题、描述文字 |
| `--text-faint` | `#C7B8AA` | placeholder、提示、页脚 |
| `--danger` | `#E8A0A0` | 邮箱格式错误边框 |
| `--success` / `--blue` / `--pink` | — | 本页暂未用到 |

### 2.2 登录页专属 Token

| Token | 色值 | 用途 |
|-------|------|------|
| `--login-title-grad` | `linear-gradient(135deg, #FFB6C1, #E8A672)` | 「喵日常」标题渐变文字 |
| `--login-btn-grad` | `linear-gradient(135deg, #FFB6C1, #FFA07A)` | 「发送魔法链接」主按钮渐变 |
| `--login-input-border` | `2px dashed rgba(232, 166, 114, 0.35)` | 输入框默认虚线边框 |
| `--login-orb-1` | `radial-gradient(circle, #FFD9C0, transparent 70%)` | 背景模糊圆 1（暖橘） |
| `--login-orb-2` | `radial-gradient(circle, #C9E4FF, transparent 70%)` | 背景模糊圆 2（冷蓝） |

> 注：v1.1.0 暂未把这些新增 token 抽进 `:root`（保持 `style.login.css` 自包含）。若后续主页面也要用粉橘渐变按钮，再抽到 `:root` 统一管理。

---

## 3. 布局

| 区域 | 说明 |
|------|------|
| 容器 `.login-app` | `max-width: 480px` 居中；`padding: 48px 24px 80px`；`text-align: center`；`position: relative; z-index: 1`（压在背景圆之上） |
| 顶部 Hero `.login-hero` | 小猫插画 + 标题 + 副标题纵向排列，`margin-bottom: 0` |
| 登录卡片 `.login-card` | 居中的磨砂玻璃卡片，承载表单 |
| 页脚 `.login-footer` | `margin-top: 32px`，淡灰小字 |

**间距关系**：副标题 `.login-welcome` 到「喵日常」标题、以及到登录卡片的距离**相等（各 24px）**，视觉上下居中。

---

## 4. 组件样式

### 4.1 登录卡片（磨砂玻璃）

```css
.login-card {
  background: var(--bg-glass);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 24px;          /* radius-xl，与 v1.0 卡片一致 */
  padding: 28px 24px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow:
    0 8px 24px rgba(90, 74, 66, 0.08),
    inset 0 2px 0 rgba(255, 255, 255, 0.5);
  text-align: left;             /* 卡片内文字左对齐，和 v1.0 一致 */
}
.login-card-title {
  font-size: 18px;
  font-weight: 700;
  display: flex; align-items: center; gap: 8px;
}
.login-desc {
  font-size: 12px; line-height: 1.6;
  color: var(--text-soft);
  margin-bottom: 20px;
  white-space: nowrap;          /* 默认手机宽度一行显示，≤380px 时缩到 11px */
}
```

### 4.2 邮箱输入框

```css
.login-input {
  background: rgba(255, 255, 255, 0.6);
  border: var(--login-input-border);
  border-radius: 14px;
  padding: 14px 16px;
  font-family: inherit;
  font-size: 15px;
  color: var(--text-main);
}
.login-input::placeholder { color: var(--text-faint); }   /* 默认邮箱淡灰，点击自动消失 */
.login-input:focus {
  outline: none;
  border-style: solid;
  border-color: var(--orange);
}
.login-input:invalid:not(:placeholder-shown) { border-color: var(--danger); }   /* 格式错误变红 */
.login-input:valid:not(:placeholder-shown)   { border-color: var(--orange-deep); } /* 格式正确变橘深 */
```

**规则**：
- 默认邮箱用 `placeholder`（不是 value），所以颜色天然淡灰、点击自动清空。
- `type="email"` + `required` 走浏览器原生校验；CSS 用 `:valid` / `:invalid` 给实时边框反馈（空时不触发，因为 `:placeholder-shown`）。

### 4.3 主提交按钮（醒目渐变）

```css
.login-submit {
  background: var(--login-btn-grad);
  color: #fff;
  border: none;
  border-radius: 16px;
  padding: 14px 20px;
  font-size: 16px; font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(255, 154, 158, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.login-submit:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(255, 154, 158, 0.4); }
.login-submit:active { transform: translateY(0); }
```

**规则**：这是登录页唯一的 CTA，比 v1.0 卡片里的 chip 按钮更醒目（粉橘渐变 + 白字），符合"聚焦"定位。

### 4.4 小猫插画 + 动画

- 复用 v1.0 hero 区的 SVG 圆滚小猫（viewBox `0 0 120 120`，橘白+粉腮红）。
- 尺寸 `92px`（≤380px 时 `74px`）。
- **动画 `float-gentle`**：只向上轻浮 `8px`，避免向右下漂移挡住标题文字。

```css
@keyframes float-gentle {
  from { transform: translateY(0); }
  to   { transform: translateY(-8px); }
}
.login-illustration { animation: float-gentle 4s ease-in-out infinite alternate; }
```

### 4.5 提示文案

| 位置 | 文案 | 样式 |
|------|------|------|
| 副标题 `.login-welcome` | 一键开启你的小日常 | 15px，`--text-soft`，上下各 24px margin |
| 卡片描述 `.login-desc` | 输入邮箱，我们会发一封「魔法链接」到你邮箱，点一下就能登录啦～ | 12px，`--text-soft`，一行 |
| 底部提示 `.login-hint` | 🐾 输入邮箱，邮件里一键登录～ | 12px，`--text-faint`，居中 |
| 页脚 `.login-footer` | Made with 💛 by 咪咪大人 | 12px，`--text-faint` |

---

## 5. 动效

| 动画 | 目标 | 参数 |
|------|------|------|
| `float-gentle` | 小猫插画 | `translateY(0 → -8px)`，`4s ease-in-out infinite alternate` |
| `float` | 背景模糊圆 | `translate(0,0 → 30px,30px)`，`22s` / `26s` 两圆错开，缓慢漂浮 |

> 背景圆 `float` 沿用 v1.0 参数；小猫单独用 `float-gentle`（原 v1.0 小猫用 `float` 会向右下漂移，登录页标题在下方，故改为只上飘）。

---

## 6. 响应式断点

| 断点 | 行为 |
|------|------|
| `≤380px` | `.login-app` padding `32px 16px 80px`；标题 28px；小猫 74px；卡片 padding `24px 16px`；描述 11px（保证一行） |
| `381-768px` | 默认移动端 |
| `≥769px` | 居中，最大宽 480px |

---

## 7. 验收清单（登录页视觉）

写完代码后逐项打勾：

- [ ] 奶油米色背景 + 4 色径向渐变，两个模糊圆漂浮
- [ ] 圆滚小猫插画可见，仅向上轻浮 8px（不挡标题）
- [ ] 标题「喵日常」渐变文字，副标题在标题与卡片之间上下居中
- [ ] 卡片磨砂玻璃（半透明白 + `backdrop-filter`）
- [ ] 邮箱输入框默认虚线边框，focus 变实线 + 橙色
- [ ] 输入错误格式边框变红、正确格式变橘深
- [ ] 默认邮箱为淡灰 placeholder，点击自动清空
- [ ] 主按钮粉橘渐变 + 白字，hover 上抬
- [ ] 卡片描述默认一行显示（窄屏缩字不破版）
- [ ] 底部提示与页脚淡灰小字

---

**最后更新**：2026-09-11 v1.1.0
**配套文档**：`UI_DESIGN_SPEC.md`（v1.0 主页面）、`PRD.v1.1.md`（需求）、`DEVELOPMENT_PLAN.md`（步骤）
