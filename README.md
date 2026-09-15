# GitHub Code Search Star & Updated Sorter

> A userscript (Tampermonkey / Violentmonkey) that enhances GitHub code search results by displaying each repository's **Star count**, **file last-commit date**, and **repo update date**, with dual-date sorting, default-order restore, cross-page scan aggregation, and click-through to the matched file lines.

[简体中文](./README.zh-CN.md) | English

---

## ✨ Features

-  **Show Stars & Dual Dates** — Each code search result gets a badge with the repository's ⭐ Star count, 📄 file last-commit date, and 🕒 repository update date, fetched via the GitHub API.
-  **In-page Sorting** — Sort current-page results by Stars, File date, or Repo date (click again to toggle ascending/descending); the badge switches to show the date being sorted. Restore the original order at any time.
-  **Cross-page Scan & Aggregate** — Scan multiple result pages at once, list every unique file (with its path, line range, Stars, dates, and page number), deduplicate repositories, and sort by Stars / File date / Repo date.
-  **Click to Jump to the Matched Lines** — Rows in the scan panel are clickable: they open the file on GitHub in a new tab and jump straight to the matched line range (e.g. `#L10-L20`).
-  **GitHub Token Support** — Optionally set a Personal Access Token to raise the API rate limit from 60 to 5000 requests/hour.
-  **Caching** — Repo and file-commit data is cached in `sessionStorage` (10-minute TTL) to reduce redundant API calls.

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
2. After results load, each result header shows a `⭐ <stars>  📄 <file date>  🕒 <repo date>` badge (only one date is displayed at a time depending on the current sort).
3. Use the toolbar above the results list:
   - **Sort by Stars** — sort current results by Star count.
   - **Sort by File Date** — sort by the matched file's last-commit date; the badge switches to 📄.
   - **Sort by Repo Date** — sort by the repository's last update date; the badge switches to 🕒.
   - **Restore Default Order** — revert to GitHub's original ordering (badge returns to file date).
   - **📊 Scan N Pages & Aggregate** — scan multiple pages and show an aggregated file-level summary panel.

### Scan panel

Clicking **📊 Scan N Pages & Aggregate** opens a floating panel that:

- Shows per-page statistics (result items, unique files, and unique repos).
- Lists every unique **file** across the scanned pages, including its file path, line range, repo name, page number, Stars, and date.
- Supports sorting by ⭐ Stars, 📄 File Updated, or 🕒 Repo Updated (the displayed date follows the sort).
- Click a row to open that file on GitHub in a new tab and jump directly to the matched line range (e.g. ` : L10-L20`); Ctrl/Cmd/Shift/middle click keeps your browser's default behavior.
- Supports **Rescan**. Closing the panel keeps it hidden until you scan again.

### Script menu commands

In your userscript manager's script menu (Tampermonkey or Violentmonkey), the following commands are available:

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

1. [Click here to create a token](https://github.com/settings/tokens/new?description=github-code-search-sorter&scopes=repo,read:project&default_expires_at=none) — the description and scopes are pre-filled. Then click **Generate token**.
   - (Alternatively, go to <https://github.com/settings/tokens> and create a classic token with the `public_repo` scope, or a fine-grained token with **Public Repositories → Read-only**.)
2. Open your userscript manager's script menu (Tampermonkey or Violentmonkey) → **⚙️ Set GitHub Token**.
3. Paste the token and confirm. The page reloads automatically.

The Token is stored locally via `GM_setValue` and never leaves your browser.

### Scan pages

Use the menu command **📄 Set Scan Pages** to choose how many result pages are scanned (1–20). Default is **3**.

---

## 🛠️ How it works

1. On GitHub code search pages (`/search?type=code`), the script observes the results list.
2. For each result item, it extracts the repository full name (`owner/repo`), the matched file path, and the line anchor (`#L10` / `#L10-L20`) when present.
3. It calls `GET /repos/{owner}/{repo}` for Stars and repo update time, and `GET /repos/{owner}/{repo}/commits?path={file}` for the file's last-commit date.
4. Results are rendered as an inline badge in each result's header bar.
5. Sorting and scanning operate on the DOM elements; the original order is tracked via a `WeakMap` so it can be restored.
6. Scan panel rows build a `https://github.com/{repo}/blob/HEAD/{path}#L{start}-L{end}` link so a click opens the exact matched lines.

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
- Each matched file requires an extra Commits API call to get its file date, so scanning consumes more API quota than just showing Stars. A Token is highly recommended.

---

## 📄 License

MIT License — feel free to use and modify.
