# GitHub Code Search Star & Updated Sorter

See each repository's **Star count**, the **matched file's last-commit date**, and the **repo update date** right inside GitHub code search results — and sort by any of them.

## ✨ Features

- **Live Stars & dates** — Badges are attached as placeholders the moment results appear and filled in place as each response arrives, so you never wait for every request to finish. Multiple results from the same repo share a single request.
- **In-page sorting** — Sort by Stars, File date, or Repo date; click again to toggle ascending/descending. Restore GitHub's original order at any time.
- **Cross-page scan & aggregate** — Scan several result pages at once and get a file-level, de-duplicated summary (file path, line range, Stars, dates, page numbers), with a rescan button.
- **Click to jump to the matched lines** — Every row in the scan panel opens the file on GitHub in a new tab and jumps straight to the matched line range (e.g. `#L10-L20`).
- **Bilingual** — The UI language follows your browser (`zh*` → Chinese, otherwise English) and can be overridden from the menu.
- **Caching** — Repo and file data is cached in `sessionStorage` (10-minute TTL) to reduce redundant requests.

## 🚀 Usage

1. After installing, open https://github.com/search?type=code and run a code search.
2. Each result header shows a badge: `⭐ stars  📄 file date  🕒 repo date` (only one date is shown at a time, matching the current sort).
3. A toolbar appears above the results with three sort buttons, **Restore Default Order**, and **📊 Scan N Pages & Aggregate**.

## ⚙️ Menu commands

Available in your userscript manager's script menu:

| Command | Description |
|---|---|
| ⚙️ Set GitHub Token | Set a Personal Access Token to raise the API rate limit from 60 to 5000 requests/hour |
| 🗑️ Clear GitHub Token | Remove the saved Token |
| ℹ️ View Token Status | Show whether a Token is set and the current rate limit |
| 📄 Set Scan Pages | Set how many result pages to scan (1–20, default 3) |
| 🌐 UI Language | Set the UI language: `zh` / `en` / `auto` (follow browser by default) |

## ⚠️ Notes

- Only applies to **code search** (`type=code`). Other search types (repositories, issues, etc.) are not affected.
- **Setting a Token is strongly recommended**: without one you are limited to 60 anonymous requests/hour, shared across all scripts/browsers on your IP. Each matched file also needs an extra Commits API call for its date.
- Scanning more pages takes longer and consumes more API quota.
- GitHub may change its page structure, which could break result parsing. If that happens, please report it on the script page.

## 🔗 Links

- Source & issue tracker: <https://github.com/micoe/github-code-search-sorter>
- This script updates automatically via GitHub sync.

## 📄 License

MIT
