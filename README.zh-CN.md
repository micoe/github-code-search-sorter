# GitHub 代码搜索 Star 与更新时间排序助手

> 一个适用于 Tampermonkey（油猴）/ Violentmonkey（暴力猴）的用户脚本，为 GitHub 代码搜索结果显示仓库的 **Star 数**、**文件最后提交日期** 与 **仓库更新日期**，支持双日期排序、恢复默认排序、跨页扫描汇总，并可直接点击跳转到匹配文件行。

简体中文 | [English](./README.md)

---

## ✨ 功能特性

-  **显示 Star 数与双日期** — 在每条代码搜索结果上展示该仓库的 ⭐ Star 数、📄 文件最后提交日期与 🕒 仓库更新日期，数据通过 GitHub API 获取。
-  **实时增量渲染** — 结果一出现就先挂上占位徽章（`⭐ … 📄 …`），不必等所有请求完成；Star 与日期在各自数据返回时**立即就地填充**，同一仓库的多个结果只请求一次。
-  **页内排序** — 支持按 Star 数、文件更新日期、仓库更新日期对当前页结果排序（再次点击切换升/降序），徽章会随之切换显示对应日期；可随时恢复 GitHub 默认顺序。
-  **跨页扫描汇总** — 一次性扫描多页搜索结果，按文件列出所有唯一文件（含文件路径、行号范围、Star、日期、所在页码），并对仓库去重，支持按 Star / 文件日期 / 仓库日期排序。
-  **点击跳转到匹配行** — 扫描面板中的每一行都可点击，会在新标签页打开该文件并直接定位到匹配的行号范围（如 `#L10-L20`）。
-  **支持 GitHub Token** — 可配置 Personal Access Token，将 API 速率限制从 60 次/小时提升至 5000 次/小时。
-  **本地缓存** — 仓库信息与文件提交信息缓存在 `sessionStorage` 中（TTL 10 分钟），减少重复 API 请求。
-  **中英双语（单文件）** — 逻辑只有一份，界面文案取自内置字典：自动跟随浏览器语言（`zh*` → 中文，其余 → 英文），也可在菜单中手动指定；脚本在管理器列表中显示的名称与描述由 `@name:zh-CN` / `@description:zh-CN` 提供本地化。

---

## 📦 安装

1. 安装用户脚本管理器扩展：
   - [Violentmonkey（暴力猴）](https://violentmonkey.github.io/)（推荐，开源轻量）
   - [Tampermonkey（油猴）](https://www.tampermonkey.net/)（同样完全兼容）
2. 选择一种安装方式：
   - **Greasy Fork（推荐，可自动更新）** — [安装 GitHub 代码搜索 Star & 更新时间排序助手](https://greasyfork.org/zh-CN/scripts/595545)
   - **GitHub 直装** — [安装 `script.user.js`](https://raw.githubusercontent.com/micoe/github-code-search-sorter/refs/heads/main/script.user.js)
3. 访问 `https://github.com/search?type=code` 并进行代码搜索。

> **🌐 语言说明**：脚本只有一个文件，界面语言**自动跟随浏览器语言**（`zh*` → 中文，其余 → 英文），也可随时通过脚本菜单命令 **🌐 界面语言** 手动指定为 `zh` / `en` / `auto`。
>
> **⬆️ 从旧版升级**：如果你之前安装的是独立的英文版 `script.en.user.js`，请卸载它，改装上面的脚本（该文件已不再维护）。

---

## 🚀 使用说明

### 基础使用

1. 打开 [GitHub 代码搜索](https://github.com/search?type=code)。
2. 结果加载后，每条结果的标题栏右侧会出现 `⭐ <星数>  📄 <文件日期>  🕒 <仓库日期>` 徽章（同一时间只显示与当前排序对应的一个日期）。徽章会**先以 `⭐ … 📄 …` 的占位形式立刻出现**，随后随着 API 数据返回逐条填充为真实数值，无需等待全部请求完成。
3. 结果列表上方的工具栏提供以下按钮：
   - **按 Star 排序** — 按 Star 数对当前结果排序。
   - **按文件更新日期排序** — 按匹配文件的最后提交日期排序，徽章切换为 📄。
   - **按仓库更新日期排序** — 按仓库最近更新时间排序，徽章切换为 🕒。
   - **恢复默认排序** — 还原为 GitHub 原始排序（徽章恢复为文件日期）。
   - **📊 扫描 N 页并汇总** — 扫描多页结果并在浮窗中展示文件级汇总列表。

### 扫描面板

点击 **📊 扫描 N 页并汇总** 会弹出一个浮动面板：

- 显示每页统计（结果项数、唯一文件数、唯一仓库数）。
- 页面扫描完成后**立刻列出所有唯一文件**（Star 与日期先显示为 `…`），随后数据返回时逐行就地填充并自动重排，无需等全部请求完成。
- 按**文件**列出扫描范围内的所有唯一文件，包含文件路径、行号范围、仓库名、所在页码、Star 数与日期。
- 支持按 ⭐ Star、📄 文件更新、🕒 仓库更新排序（显示的日期跟随排序切换）。
- 点击某一行会在新标签页打开该文件并直接定位到匹配的行号范围（如 ` : L10-L20`）；按住 Ctrl/Cmd/Shift 或中键点击则保留浏览器默认行为。
- 支持 **重新扫描**；关闭面板后会保持隐藏，直到再次主动扫描。

### 脚本菜单命令

在脚本管理器（Tampermonkey 油猴 / Violentmonkey 暴力猴）的脚本菜单中可使用以下命令：

| 命令 | 说明 |
|---|---|
| ⚙️ 设置 GitHub Token | 设置 Personal Access Token（仅需 `public_repo` 权限）。 |
| 🗑️ 清除 GitHub Token | 清除已保存的 Token。 |
| ℹ️ 查看 Token 状态 | 显示是否已设置 Token 以及当前 API 速率限制。 |
| 📄 设置扫描页数 | 设置扫描的结果页数（1-20，默认 3）。 |
| 🌐 界面语言 | 指定界面语言：`zh`（中文）/ `en`（English）/ `auto`（跟随浏览器，默认）。 |

---

## ⚙️ 配置

### GitHub Token（推荐）

脚本调用 GitHub 公开 REST API。未设置 Token 时，匿名速率限制为 **60 次/小时**；设置 Token 后可提升至 **5000 次/小时**。

1. [点击此处创建 Token](https://github.com/settings/tokens/new?description=github-code-search-sorter&scopes=repo,read:project&default_expires_at=none) — 描述和权限已预填，直接点击页面上的 **Generate token** 即可。
   - （也可前往 <https://github.com/settings/tokens> 手动创建 classic token，勾选 `public_repo` 权限；或使用 fine-grained token 授予 **Public Repositories → Read-only** 权限。）
2. 打开脚本管理器（Tampermonkey 油猴 / Violentmonkey 暴力猴）的脚本菜单 → **⚙️ 设置 GitHub Token**。
3. 粘贴 Token 并确认，页面会自动刷新。

Token 仅通过 `GM_setValue` 保存在本地浏览器中，不会上传到任何第三方服务器。

### 扫描页数

通过菜单命令 **📄 设置扫描页数** 设置扫描的结果页数（1-20），默认 **3** 页。

---

## 🛠️ 实现原理

1. 在 GitHub 代码搜索页面（`/search?type=code`）监听结果列表变化。
2. 从每条结果中提取仓库全名（`owner/repo`）、匹配的文件路径，以及行号锚点（`#L10` / `#L10-L20`，如存在）。
3. 调用 `GET /repos/{owner}/{repo}` 获取 Star 数与仓库更新时间；调用 `GET /repos/{owner}/{repo}/commits?path={file}` 获取文件最后提交日期。两类请求在同一个并发池（默认 5 并发）中调度，**每个请求一返回就立即更新对应的徽章/面板行**，而不是等全部完成后统一渲染。
4. 在结果标题栏内渲染一个徽章展示 Star 数和日期；徽章先以占位形式挂载，再按字段逐项填充。排序激活时，新到达的数据会触发节流重排（最多每 500ms 一次），未加载完的项始终排在末尾以避免元素来回跳动。
5. 排序与扫描操作基于 DOM 元素；原始顺序通过 `WeakMap` 记录，以便随时恢复。跨页扫描面板同样在页面解析完成后先渲染全部占位行，再逐条填充。
6. 扫描面板的每一行会拼出 `https://github.com/{repo}/blob/HEAD/{path}#L{start}-L{end}` 链接，点击即打开对应文件并定位到匹配行。

### 技术说明

- 使用 `GM_xmlhttpRequest` 发起跨域 API 请求。
- 使用 `sessionStorage` 做本地缓存（关闭标签页后清除）。
- 使用 `MutationObserver` 监听 GitHub 客户端路由切换与动态内容加载。
- 单一脚本 + 内置 `I18N` 字典实现双语：语言优先级为 `GM` 设置（`lang`）> `navigator.language`；仅脚本头部的 `@name:zh-CN` / `@description:zh-CN` 由脚本管理器按语言选择，用于管理器列表中的名称与描述。

---

## ⚠️ 注意事项与限制

- 仅作用于**代码搜索**（`type=code`），不影响仓库、Issue 等其他搜索类型。
- GitHub 可能调整页面 DOM 结构，导致结果解析失效。若徽章不再显示，请提交 Issue。
- 匿名 API 速率限制（60 次/小时）在同一 IP 下的所有脚本/浏览器间共享，强烈建议设置 Token。
- 扫描功能会抓取页面 HTML 并在本地解析，扫描页数较多时耗时较长。
- 每个匹配文件都需要额外调用一次 Commits API 获取文件日期，因此扫描时消耗的 API 配额高于仅显示 Star，强烈建议设置 Token。

---

## 📄 License

MIT License — 可自由使用与修改。
