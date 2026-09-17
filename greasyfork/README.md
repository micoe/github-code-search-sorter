# Greasy Fork 发布与同步指南

本目录存放 Greasy Fork 脚本页的「附加信息（Additional info）」内容，按语言各一份，可直接粘贴或通过 GF 的 URL 同步自动拉取：

- [`additional-info.zh-CN.md`](./additional-info.zh-CN.md) — 中文
- [`additional-info.en.md`](./additional-info.en.md) — English

> **只发布一个脚本**，不要再按语言拆成两个条目。GF 原生支持脚本内容本地化（`@name:xx` / `@description:xx` + 按语言填写的附加信息），而它的重复检测会用「剥离注释与空白后的代码」计算相似度——本项目合并前的两份文件在那一步是完全一致的，拆开发布会被判为高度相似。

## 已发布

| 项目 | 值 |
|---|---|
| 脚本页（中文） | <https://greasyfork.org/zh-CN/scripts/595545> |
| 脚本页（English） | <https://greasyfork.org/en/scripts/595545> |
| 作者主页 | <https://greasyfork.org/zh-CN/users/1643120-micoe> |
| 创建 / 最近更新 | 2026-09-12 / 2026-09-17 |
| 版本 | 2.0.1 已上线；本次提交升至 **2.0.2**（补 `@license MIT`），推送并同步后生效 |

2026-09-17 核对结果：中英文页面的**名称、描述、附加信息均按访问者语言正确显示**，版本号与 GitHub raw 一致，说明本地化元数据与同步都已生效。

---

## 0. 前置条件

先把改动推送到 `main`。GF 的同步是从 GitHub raw 拉取，本地提交不推上去，GF 拉到的还是旧版：

```bash
git push origin main
```

## 1. 首次发布

1. 登录 Greasy Fork，进入 **发布脚本 / Post a script**。
2. 把 `script.user.js` 的完整内容粘贴进去（或使用「从 URL 导入」，填 raw 地址）。
   - 名称、描述由脚本头部的 `@name` / `@description` 决定，GF 会自动读取；中文与英文版本分别来自 `@name:zh-CN` / `@name:en`。
3. **附加信息**：粘贴 [`additional-info.zh-CN.md`](./additional-info.zh-CN.md) 的内容（GF 该字段支持 Markdown）。
4. 语言：勾选 Chinese 与 English，让脚本同时出现在两种语言的筛选结果里。
5. 保存。

## 2. 配置 GitHub 同步

在脚本页找到**同步设置**（Sync / WebHook 相关的区块），填入 raw 地址：

```
https://raw.githubusercontent.com/micoe/github-code-search-sorter/refs/heads/main/script.user.js
```

如果要让**本地化附加信息**也自动同步，为每种语言各加一条 URL，并用 `##语言代码` 标注归属：

```
https://raw.githubusercontent.com/micoe/github-code-search-sorter/refs/heads/main/greasyfork/additional-info.zh-CN.md##zh-CN
https://raw.githubusercontent.com/micoe/github-code-search-sorter/refs/heads/main/greasyfork/additional-info.en.md##en
```

要点与坑：

- **脚本头部必须有对应的 `@name:xx` 声明**，否则本地化内容即使提交成功也不会生效。本项目已在头部声明 `@name:zh-CN`、`@name:en`（以及对应的 `@description:xx`）。
- **语言代码大小写敏感**：`zh-cn` 会被 GF 当作未知语言，必须写 `zh-CN`。
- 有脚本作者反馈该同步表单**提交后偶尔不会保存**，保存后请回页面确认一遍，必要时重新提交。
- 想做到 push 即更新，再配置 **webhook**（GF 会给出回调地址，填到 GitHub 仓库的 Webhook 设置里）；不配也行，GF 会定期检查同步源。

## 3. 为什么只发一个脚本

| 维度 | 一个脚本（推荐） | 两个脚本 |
|---|---|---|
| 本地化展示 | GF 原生支持，中英各自显示 | 也能做到，但没必要 |
| 重复检测 | 不触发 | 剥离注释后代码完全一致 → 被判高度相似 |
| installs / 评分 / 评论 | 集中累积 | 被劈成两半，两个排名都靠后 |
| 维护成本 | 改一份 | 改两份、两个版本号、两条同步 |

## 4. 以后发版流程

1. 修改 `script.user.js`，**递增 `@version`**（GF 与用户脚本管理器都靠它判断更新）。
2. 如功能有变化，同步更新两个 README 与本目录的两份附加信息。
3. 提交并推送到 `main`。
4. GF 侧：配置了 webhook 则自动同步；否则在脚本页手动点一次同步。

## 5. 注意事项

- **GF 会覆盖 `@updateURL` / `@downloadURL`**，指向它自己托管的副本。因此从 GF 安装的用户只能从 GF 更新——这正是必须配置同步的原因。从 GitHub raw 直接安装的用户仍走脚本里的 `@updateURL`，两条路互不影响。
- 本目录的 `.md` 文件不会被 GF 当成脚本导入（GF 只导入 `*.user.js`），可放心放在仓库里。
- 不要为了「让英文用户搜到」而再发一个英文条目——本地化元数据已经覆盖了这个需求。

---

## 6. 提高曝光（合规做法）

**① 给 GitHub 仓库加 Topics** — 仓库首页 → About 右侧 ⚙️ → Topics。建议：

```
userscript  tampermonkey  violentmonkey  greasemonkey  userscript-manager
github  github-search  code-search
```

**② 打一个 Release** — 把 `v2.0.2` 作为首个 Release 发布，仓库时间线更清晰，也方便别人引用具体版本。

**③ README 徽章** — 两个 README 顶部已加 Greasy Fork 的**安装 / 版本 / 安装量**徽章。版本徽章是动态的（`img.shields.io/greasyfork/v/595545`），发版后自动跟随，无需手工维护；安装量徽章会随时间自然增长，是最直接的社会证明。

**④ 去「有人正在问这个需求」的地方回答，而不是到处贴链接**

- GitHub 上关于 code search 排序/筛选的 Discussions、Issue —— 有人在问「怎么按 Star 排序搜索结果」时给出方案，并说明脚本做了什么
- `awesome-userscripts` 之类的精选列表 —— 用 PR 提交，维护者会按收录标准审核
- 中文社区（V2EX、少数派、即刻等）的油猴 / 效率工具话题 —— 讲清楚解决了什么痛点

**避免**：在无关仓库刷评论、给 Issue 发无上下文的推广链接。容易被举报，GitHub 与 GF 都可能因此限制账号。

**一段可直接取用的介绍**（按场合裁剪长度）：

> GitHub 的代码搜索只能按相关性排，看不出哪个仓库更值得看。这个脚本在每条结果上显示仓库 Star 数、匹配文件的最后提交日期和仓库更新时间，并支持按它们排序、跨页扫描汇总、点击直达匹配行。中英双语，Token 可选（设置后 API 额度从 60 次/小时提升到 5000 次/小时）。

**关于数据**：脚本目前总安装量 3（2026-09-17）。这类垂直工具的曝光主要靠「需求出现时被搜到 / 被推荐」，不用着急，先把 README 与脚本页信息做扎实。

