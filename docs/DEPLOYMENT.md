# 喵日常 · 部署与排障手册

> 记录 v1.1.2「移动端登录攻坚」全过程。
> 这一晚踩了 6 个连环坑，每个都定位到了根因。写下来是为了**下次不用重新踩一遍**。

---

## 一、生产环境

| 项目 | 值 |
|------|-----|
| **网站地址** | `https://miao-daily-miao-daily-d1gmyiugua09ec60d.webapps.tcloudbase.com` |
| **登录页** | 上面的地址 + `/login.html` |
| **CloudBase 环境 ID** | `miao-daily-d1gmyiugua09ec60d` |
| **静态托管** | 腾讯云 CloudBase 静态网站托管（上海） |
| **Supabase 代理** | 腾讯云 SCF 云函数 `supabase-proxy`，HTTP 触发路径 `/sb` |
| **Supabase 项目** | `elvlygokedgbaihbdgrg`（项目 ID 可从 anonKey 的 JWT payload 解出） |
| **代码仓库** | GitHub `learn-vibe-coding-miao-daily` |

### 架构

```
手机 / 电脑浏览器
    ↓  HTTPS
腾讯云 CloudBase 静态托管（src/ 下的纯静态文件）
    ↓  /sb/*  （绕过国内直连 supabase.co 的不稳定）
腾讯云 SCF 云函数 supabase-proxy
    ↓  https
Supabase（Auth 魔法链接 + PostgreSQL + RLS 行级安全）
```

**为什么要有云函数这一层**：国内手机直连 `supabase.co` 不稳定，且前端需要统一的 API 入口。云函数做的是纯转发（透传 method / headers / body），不存任何业务逻辑。

---

## 二、日常部署流程

### 2.1 更新网页文件（最常用）

1. 打开 [CloudBase 控制台](https://tcb.cloud.tencent.com/dev?envId=miao-daily-d1gmyiugua09ec60d)
2. 选 `miao-daily` 环境 → 左侧「静态网站托管」
3. 顶部三个标签：`网站部署` | `基础配置` | **`文件管理`** → 点第三个
4. 「上传文件」→ 选本地文件 → 提示覆盖时点确定

> ⚠️ **「部署版本 0 条 / 未创建版本」是正常的。**
> 只有用命令行 `tcb hosting deploy` 才会生成版本记录；在「文件管理」里直接上传**只写文件、不建版本**。网站照样正常访问。

### 2.2 更新云函数

1. 云函数 → `supabase-proxy` → 「上传代码」标签
2. 选 **ZIP 包**（zip 里必须**直接是 `index.js`，不能套文件夹**）
3. 点「确认部署」，等状态变回「✅ 正常」

打包命令：

```bash
cd tencent-scf
zip -j -q ~/Desktop/supabase-proxy.zip supabase-proxy/index.js
```

> 控制台的**在线编辑器常报 `GetCloudStudioInfo` 错误**，不用管，走上传 zip 这条路就行。
> 部署时提示「缺少 package.json」也不用管——函数只用 Node 内置的 `https` 和 `zlib`，不需要任何第三方依赖。

### 2.3 ⚠️ 改完必须升版本号

`src/index.html` 和 `src/login.html` 里所有资源引用都带 `?v=N`（如 `app.js?v=11`）。**每次改线上文件都要同步 +1**，否则移动端浏览器缓存会让你的修复"看起来没生效"——这个坑让我们白白排查了两轮。

```bash
cd src
sed -i '' 's/?v=11/?v=12/g' index.html login.html
```

当前线上版本：`?v=11`

---

## 三、排障手册（6 个坑，按发现顺序）

验证线上版本的**最快方式**是 curl，比截图快且确定：

```bash
D=miao-daily-miao-daily-d1gmyiugua09ec60d.webapps.tcloudbase.com
curl -s "https://$D/index.html" | grep -o '?v=[0-9]*' | sort -u
curl -s "https://$D/app.js" | grep -c '某个新函数名'
```

---

### 坑 1 · jsdelivr CDN 被墙

| | |
|---|---|
| **现象** | 手机上一直转圈、白屏；电脑上正常 |
| **根因** | 页面从 jsdelivr 加载 Supabase SDK，国内手机访问不到 |
| **解法** | **自托管 SDK**：把 `@supabase/supabase-js@2` 的 `dist/umd/supabase.js` 存到 `src/vendor/supabase-js.js`（全局对象 `supabase`），页面直接引本地文件 |

---

### 坑 2 · Vercel 域名被 DNS 污染

| | |
|---|---|
| **现象** | 手机报 `ERR_CONNECTION_ABORTED (-103)`；**换流量、换手机都不行**；其他电脑却能打开 |
| **定位** | 解析到的 IP 是 `31.13.88.169`（Facebook 的 IP），不是 Vercel 的 → 典型 DNS 污染 |
| **解法** | **整体迁到腾讯云 CloudBase 静态托管** |

**中间踩的岔路：COS 静态站不可用。**
腾讯云 COS 的静态网站在响应里带 `Content-Disposition: attachment` 和 `x-cos-force-download`，手机访问会**直接下载 html 文件**而不是打开。用 curl 带 User-Agent 验证：

```bash
curl -sI -A "Mozilla/5.0 (iPhone...)" "https://<bucket>.cos-website.ap-shanghai.myqcloud.com/"
```

看到这两个头就放弃 COS，改用 CloudBase。

---

### 坑 3 · SDK 的 `setSession()` 在手机上永不返回

| | |
|---|---|
| **现象** | 点邮件链接后一直卡在遮罩，登录永远不完成 |
| **根因** | Supabase SDK 的 `setSession()` 内部会 `await initializePromise`，手机环境下初始化卡住 → 这个 Promise **永远不 resolve**，`.then` 一次都不执行 |
| **解法** | **彻底绕开 SDK**：自己读写会话，不调用 `setSession` / `signOut` / `getSession` |

会话存在 `localStorage` 的自有 key `miao_daily_session`（SDK 那套 `sb-<ref>-auth-token` 只作为兼容写入，不作为读取来源）。

---

### 坑 4 · 代理返回压缩乱码（最隐蔽的一个）

| | |
|---|---|
| **现象** | 「取不到用户信息」；测通道「看起来是通的」（能收到 401） |
| **根因** | 云函数把上游的 **gzip 响应当普通字符串转码**，二进制被压坏 |

**铁证**（响应体的十六进制）：

```
1f efbfbd 08 ...
   ^^^^^^^^
```

`1f 8b` 是 gzip 文件头的标志，但 `8b` 变成了 `efbfbd`（UTF-8 的"无法表示"替换符）—— 说明数据被当成文本做了一次有损转码。

**为什么之前没发现**：小的错误响应（几百字节）不压缩，所以测通道时一切正常；用户信息这种大 JSON 一压缩就露馅。

**解法**：登录改为**不发任何网络请求**——`access_token` 本身就是 JWT，本地 base64 解码 payload 即可拿到 `sub`（用户 ID）：

> ✅ **后续（2026-09-12 02:20）**：修复版云函数已部署（探针头 `X-Proxy-Version: 1.1.2-fix2`），并对数据同步这类**必须走网络**的请求加了**魔数兜底解压**——不看 `content-encoding` 头，直接按 `1f 8b` 文件头识别 gzip 并解压，即使上游忽略 `identity` 要求也能自愈。手机端数据同步通道已恢复。

```js
function decodeJwtPayload(token) {
  var seg = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  while (seg.length % 4) seg += '=';
  return JSON.parse(atob(seg));
}
// decodeJwtPayload(access_token).sub  →  用户 ID
```

**排查命令**（对比两种 Accept-Encoding 就能确认）：

```bash
curl -s -H 'Accept-Encoding: identity'  https://<代理>/sb/auth/v1/user  # 明文 ✅
curl -s -H 'Accept-Encoding: gzip, deflate, br' ...                      # 乱码 ❌
```

---

### 坑 5 · 项目 ID 取不到

| | |
|---|---|
| **现象** | 手动登录函数一进来就判定失败，从没真正跑过 |
| **根因** | 代码用正则从 API 地址提取 `https://<ref>.supabase.co`，但地址早就换成了 `...tcloudbase.com/sb`，**正则匹配为空** |
| **解法** | 不再从地址猜 —— 直接从 anonKey 的 JWT payload 里解出 `ref` |

```js
var payload = JSON.parse(atob(anonKey.split('.')[1]));
payload.ref;  // → elvlygokedgbaihbdgrg
```

> 💡 **教训**：改了配置里的 URL 之后，要全局搜索所有依赖旧 URL 形态的正则/字符串处理。

---

### 坑 6 · 手机把 `#` 后的凭证弄丢（终极 Boss）

| | |
|---|---|
| **现象** | 手机点邮件链接 → 跳回登录页；电脑点同样的链接 → 正常进入 |
| **根因** | 邮件里的链接其实**不是**带凭证的最终链接，而是 `https://<ref>.supabase.co/auth/v1/verify?token=…&type=magiclink&redirect_to=…`。<br>凭证要等浏览器访问这条链接、Supabase **302 跳回咱们网站**之后，才出现在网址 **`#` 后面**：<br>`https://…tcloudbase.com/index.html#access_token=eyJ…&refresh_token=…`<br>而 **邮件 App 内置浏览器 + 腾讯「确定访问」中间页会把 `#` 后面的内容整个吃掉** → 落地时只剩干净网址 → 只能回登录页 |

**解法：粘贴链接登录**（`src/linklogin.js`）

双引擎，两种粘贴内容都认：

1. **链接直接带 `access_token`** → 本地拆 JWT 取用户 ID，秒登（不发请求）
2. **粘的是 `supabase.co/auth/v1/verify?token=…` 验证链接** → **在当前页面内代为完成验证跳转**，302 回跳的凭证被本页直接接住。全程一个标签页，不给邮件 App 和中间页任何交接的机会 ✨

💡 implicit 流程的凭证**点过一次不会作废**，所以「先点了没进去、再复制粘贴」照样有效。

**用户侧操作**：邮箱里**长按**邮件按钮 → 「拷贝链接地址」→ 粘到登录页的蓝色区域 → 点「用链接登录」

---

## 四、日常运维速查

### 验证一次发布是否生效

```bash
D=miao-daily-miao-daily-d1gmyiugua09ec60d.webapps.tcloudbase.com

# 1. 线上跑的是第几版
curl -s "https://$D/index.html" | grep -o '?v=[0-9]*' | sort -u

# 2. 新代码在不在
curl -s "https://$D/app.js" | grep -c 'decodeJwtPayload'

# 3. 代理通道还活着吗（401 = 通了只是没凭证，属于正常）
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  "https://miao-daily-d1gmyiugua09ec60d-1484425697.ap-shanghai.app.tcloudbase.com/sb/auth/v1/user"

# 4. 有没有被缓存
curl -sI "https://$D/index.html" | grep -i 'cache-control'
```

### 代发一封魔法链接（调试用）

```bash
cd /Users/mia/WorkBuddy/2026-09-11-12-25-52/miao-daily
/Users/mia/.workbuddy/binaries/node/versions/22.22.2-3/bin/node -e "
global.window={}; require('./src/config.js');
var cfg=window.SUPABASE_CONFIG;
var to='https://miao-daily-miao-daily-d1gmyiugua09ec60d.webapps.tcloudbase.com/index.html';
fetch(cfg.url+'/auth/v1/otp?redirect_to='+encodeURIComponent(to),{
  method:'POST',
  headers:{'apikey':cfg.anonKey,'Content-Type':'application/json'},
  body:JSON.stringify({email:'<邮箱>',create_user:true})
}).then(r=>console.log('status:',r.status));
"
```

### Supabase 后台必须检查的配置

- **Authentication → URL Configuration → Site URL**：必须填 CloudBase 域名（填 localhost 会导致邮件链接跳回 localhost）
- **Redirect URLs**：要包含 CloudBase 的两个域名（`webapps.tcloudbase.com` 和 `tcloudbaseapp.com`）
- **Auth Providers → Email**：`flowType` 在前端 `src/supabase.js` 里设为 `implicit`（凭证在 `#` 后，跨浏览器可用；PKCE 需要 `code_verifier`，跨 App 打开必然失败）

---

## 五、已知限制 & 后续可选优化

| 问题 | 影响 | 彻底解法 |
|------|------|---------|
| 手机点链接仍会回登录页 | 需用粘贴通道绕过 | ① 域名 **ICP 备案**去掉「确定访问」中间页；② 改 **6 位验证码登录**（邮件模板内容换成 `{{ .Token }}`，前端加验证码输入框），完全不依赖跳转 |
| ~~云端数据同步在手机可能不灵~~ | ✅ **已解决（2026-09-12 02:20）** | 修复版云函数已部署（探针头 `X-Proxy-Version: 1.1.2-fix2` 可远程验证），手机端同步通道恢复 |
| 「确定访问」中间页 | 首次访问多点一次 | 等 ICP 备案通过 |

改成 6 位验证码后，**手机和电脑的体验就完全一致了**：填邮箱 → 收 6 位数字 → 填进去 → 进。不挑浏览器、不挑邮件 App，比点链接还稳。

### 云函数版本探针

云函数响应带 `X-Proxy-Version` 头，随时可以远程确认线上跑的是哪版：

```bash
curl -sI "https://miao-daily-d1gmyiugua09ec60d-1484425697.ap-shanghai.app.tcloudbase.com/sb/auth/v1/user" \
  | grep -i x-proxy
# 当前应为：X-Proxy-Version: 1.1.2-fix2
```

---

## 六、一份提醒：别让 AI 瞎改这个项目

排查期间，另一个 AI 工具给出过两份「诊断报告」，都**没有真正读取项目结构**：

- 第一份建议改 `src/utils/session.js`、`src/api/auth.js`、配置 Cookie `sameSite`、跑 `pm2 restart server` —— 这些文件和后端**在本项目里根本不存在**（纯静态站，无后端）
- 第二份方向对了（`#` 后凭证丢失），但建议「把凭证从 `#` 改成 `?`」—— 而链接是 **Supabase 生成的，改不了**；它提的 `localStorage.temp_token` 抢救方案，代码里从来没往里存过

**给 AI 派活前，先让它证明自己读过代码。** 它的建议可以当思路参考，但执行前一定要用 `git status` 和文件检查确认。
