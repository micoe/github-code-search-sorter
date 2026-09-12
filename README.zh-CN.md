# GitHub Code Search Star & Updated Sorter

> 一个适用于 Tampermonkey / Violentmonkey 的油猴脚本，为 GitHub 代码搜索结果中的每个仓库显示 **Star 数** 和 **最近更新时间**，并支持排序、恢复默认排序、跨页扫描汇总。

简体中文 | [English](./README.md)

---

## ✨ 功能特性

-  **显示 Star 数与更新时间** — 在每条代码搜索结果上展示该仓库的 ⭐ Star 数与 🕒 最近更新日期，数据通过 GitHub API 获取。
-  **页内排序** — 支持按 Star 数或更新时间对当前页结果排序（再次点击切换升/降序），可随时恢复 GitHub 默认顺序。
-  **跨页扫描汇总** — 一次性扫描多页搜索结果，对仓库去重后列出所有唯一仓库及其 Star、更新时间、所在页码。
-  **支持 GitHub Token** — 可配置 Personal Access Token，将 API 速率限制从 60 次/小时提升至 5000 次/小时。
-  **本地缓存** — 仓库信息缓存在 `sessionStorage` 中（TTL 10 分钟），减少重复 API 请求。

---

## 📦 安装

1. 安装用户脚本管理器扩展：
   - [Violentmonkey](https://violentmonkey.github.io/)（推荐，开源轻量）
   - [Tampermonkey](https://www.tampermonkey.net/)（同样完全兼容）
2. 点击下方任一链接，脚本管理器会自动弹出安装页面：
   - 中文界面: [安装 `script.user.js`](https://raw.githubusercontent.com/micoe/github-code-search-sorter/refs/heads/main/script.user.js)
   - English UI: [Install `script.en.user.js`](https://raw.githubusercontent.com/micoe/github-code-search-sorter/refs/heads/main/script.en.user.js)
3. 访问 `https://github.com/search?type=code` 并进行代码搜索。

---

## 🚀 使用说明

### 基础使用

1. 打开 [GitHub 代码搜索](https://github.com/search?type=code)。
2. 结果加载后，每条结果的标题栏右侧会出现 `⭐ <星数>  🕒 <日期>` 徽章。
3. 结果列表上方的工具栏提供以下按钮：
   - **按 Star 排序** — 按 Star 数对当前结果排序。
   - **按更新时间排序** — 按最近更新时间排序。
   - **恢复默认排序** — 还原为 GitHub 原始排序。
   - **📊 扫描 N 页并汇总** — 扫描多页结果并在浮窗中展示去重后的汇总列表。

### 扫描面板

点击 **📊 扫描 N 页并汇总** 会弹出一个浮动面板：

- 显示每页统计（结果项数 / 唯一仓库数）。
- 列出扫描范围内所有唯一仓库。
- 支持按 ⭐ Star 或 🕒 更新时间排序。
- 点击仓库行可跳转到该仓库首次出现的结果页。
- 支持 **重新扫描**。

### 脚本菜单命令

在脚本管理器（Tampermonkey 或 Violentmonkey）的脚本菜单中可使用以下命令：

| 命令 | 说明 |
|---|---|
| ⚙️ 设置 GitHub Token | 设置 Personal Access Token（仅需 `public_repo` 权限）。 |
| 🗑️ 清除 GitHub Token | 清除已保存的 Token。 |
| ℹ️ 查看 Token 状态 | 显示是否已设置 Token 以及当前 API 速率限制。 |
| 📄 设置扫描页数 | 设置扫描的结果页数（1-20，默认 3）。 |

---

## ⚙️ 配置

### GitHub Token（推荐）

脚本调用 GitHub 公开 REST API。未设置 Token 时，匿名速率限制为 **60 次/小时**；设置 Token 后可提升至 **5000 次/小时**。

1. [点击此处创建 Token](https://github.com/settings/tokens/new?description=github-code-search-sorter&scopes=repo,read:project&default_expires_at=none) — 描述和权限已预填，直接点击页面上的 **Generate token** 即可。
   - （也可前往 <https://github.com/settings/tokens> 手动创建 classic token，勾选 `public_repo` 权限；或使用 fine-grained token 授予 **Public Repositories → Read-only** 权限。）
2. 打开脚本管理器（Tampermonkey 或 Violentmonkey）的脚本菜单 → **⚙️ 设置 GitHub Token**。
3. 粘贴 Token 并确认，页面会自动刷新。

Token 仅通过 `GM_setValue` 保存在本地浏览器中，不会上传到任何第三方服务器。

### 扫描页数

通过菜单命令 **📄 设置扫描页数** 设置扫描的结果页数（1-20），默认 **3** 页。

---

## 🛠️ 实现原理

1. 在 GitHub 代码搜索页面（`/search?type=code`）监听结果列表变化。
2. 从每条结果中提取仓库全名（`owner/repo`）。
3. 调用 `GET https://api.github.com/repos/{owner}/{repo}` 获取 `stargazers_count` 与 `updated_at`。
4. 在结果标题栏内渲染一个徽章展示 Star 数和更新日期。
5. 排序与扫描操作基于 DOM 元素；原始顺序通过 `WeakMap` 记录，以便随时恢复。

### 技术说明

- 使用 `GM_xmlhttpRequest` 发起跨域 API 请求。
- 使用 `sessionStorage` 做本地缓存（关闭标签页后清除）。
- 使用 `MutationObserver` 监听 GitHub 客户端路由切换与动态内容加载。

---

## ⚠️ 注意事项与限制

- 仅作用于**代码搜索**（`type=code`），不影响仓库、Issue 等其他搜索类型。
- GitHub 可能调整页面 DOM 结构，导致结果解析失效。若徽章不再显示，请提交 Issue。
- 匿名 API 速率限制（60 次/小时）在同一 IP 下的所有脚本/浏览器间共享，强烈建议设置 Token。
- 扫描功能会抓取页面 HTML 并在本地解析，扫描页数较多时耗时较长。

---

## 📄 License

MIT License — 可自由使用与修改。
