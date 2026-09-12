# GitHub Code Search Star & Updated Sorter

> A Tampermonkey userscript that enhances GitHub code search results by displaying each repository's **Star count** and **last update date**, with support for sorting, restoring the default order, and cross-page scan aggregation.

[简体中文](./README.zh-CN.md) | English

---

## ✨ Features

-  **Show Stars & Update Time** — Each code search result gets a badge with the repository's ⭐ Star count and 🕒 last update date, fetched via the GitHub API.
-  **In-page Sorting** — Sort current-page results by Stars or by Update Time (click again to toggle ascending/descending); restore the original order at any time.
-  **Cross-page Scan & Aggregate** — Scan multiple result pages at once, deduplicate repositories, and list every unique repo with its Stars, update date, and the page(s) it appears on.
-  **GitHub Token Support** — Optionally set a Personal Access Token to raise the API rate limit from 60 to 5000 requests/hour.
-  **Caching** — Repository data is cached in `sessionStorage` (10-minute TTL) to reduce redundant API calls.

---

## 📦 Installation

1. Install a userscript manager extension:
   - [Violentmonkey](https://violentmonkey.github.io/) (recommended, open-source & lightweight)
   - [Tampermonkey](https://www.tampermonkey.net/) (also fully supported)
2. Click one of the links below — your userscript manager will automatically open the install page:
   - English UI: [Install `script.en.user.js`](https://raw.githubusercontent.com/micoe/github-code-search-sorter/refs/heads/main/script.en.user.js)
   - 中文界面: [安装 `script.user.js`](https://raw.githubusercontent.com/micoe/github-code-search-sorter/refs/heads/main/script.user.js)
3. Visit `https://github.com/search?type=code` and run a code search.

---

## 🚀 Usage

### Basic usage

1. Go to [GitHub Code Search](https://github.com/search?type=code).
2. After results load, each result header shows a `⭐ <stars>  🕒 <date>` badge.
3. Use the toolbar above the results list:
   - **Sort by Stars** — sort current results by Star count.
   - **Sort by Update Time** — sort current results by last update date.
   - **Restore Default Order** — revert to GitHub's original ordering.
   - **📊 Scan N Pages & Aggregate** — scan multiple pages and show a deduplicated summary panel.

### Scan panel

Clicking **📊 Scan N Pages & Aggregate** opens a floating panel that:

- Shows per-page statistics (result items / unique repos per page).
- Lists all unique repositories across the scanned pages.
- Supports sorting by ⭐ Stars or 🕒 Updated time.
- Click a repository row to jump to the first page it appears on.
- Supports **Rescan**.

### Script menu commands

In Tampermonkey's script menu, the following commands are available:

| Command | Description |
|---|---|
| ⚙️ Set GitHub Token | Set a Personal Access Token (only `public_repo` scope needed). |
| 🗑️ Clear GitHub Token | Remove the saved Token. |
| ℹ️ View Token Status | Show whether a Token is set and the current API rate limit. |
| 📄 Set Scan Pages | Set how many pages to scan (1–20, default 3). |

---

## ⚙️ Configuration

### GitHub Token (recommended)

The script uses the public GitHub REST API. Without a Token you are limited to **60 requests/hour** (anonymous). With a Token the limit rises to **5000 requests/hour**.

1. Create a token at <https://github.com/settings/tokens> (classic token with `public_repo` scope, or a fine-grained token with **Public Repositories → Read-only**).
2. Open the Tampermonkey script menu → **⚙️ Set GitHub Token**.
3. Paste the token and confirm. The page reloads automatically.

The Token is stored locally via `GM_setValue` and never leaves your browser.

### Scan pages

Use the menu command **📄 Set Scan Pages** to choose how many result pages are scanned (1–20). Default is **3**.

---

## 🛠️ How it works

1. On GitHub code search pages (`/search?type=code`), the script observes the results list.
2. For each result item, it extracts the repository full name (`owner/repo`).
3. It calls `GET https://api.github.com/repos/{owner}/{repo}` to fetch `stargazers_count` and `updated_at`.
4. Results are rendered as an inline badge in each result's header bar.
5. Sorting and scanning operate on the DOM elements; the original order is tracked via a `WeakMap` so it can be restored.

### Technical notes

- Uses `GM_xmlhttpRequest` for cross-origin API requests.
- Uses `sessionStorage` for caching (cleared when the tab closes).
- Uses `MutationObserver` to handle GitHub's client-side navigation and dynamic result loading.

---

## ⚠️ Notes & Limitations

- Only applies to **code search** (`type=code`). Other search types (repositories, issues, etc.) are not affected.
- GitHub may change its page DOM structure, which could break the result parsing. If the badge stops appearing, please open an issue.
- The anonymous API rate limit (60/hour) is shared across all scripts/browsers using your IP. Setting a Token is strongly recommended.
- The scan feature fetches page HTML and parses it locally; large scan ranges may take a while.

---

## 📄 License

MIT License — feel free to use and modify.
