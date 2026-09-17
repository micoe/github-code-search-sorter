// ==UserScript==
// @name         GitHub 代码搜索 Star & 更新时间排序助手
// @name:zh-CN   GitHub 代码搜索 Star & 更新时间排序助手
// @name:en      GitHub Code Search Star & Updated Sorter
// @namespace    https://github.com/micoe
// @version      2.0.2
// @icon         https://github.githubassets.com/favicons/favicon.svg
// @description  在 GitHub 代码搜索结果中显示仓库 Star 数和文件/仓库更新时间（数据到达即实时渲染），支持双日期排序、恢复默认、跨页扫描汇总，点击可跳转到对应文件行
// @description:zh-CN  在 GitHub 代码搜索结果中显示仓库 Star 数和文件/仓库更新时间（数据到达即实时渲染），支持双日期排序、恢复默认、跨页扫描汇总，点击可跳转到对应文件行
// @description:en  Display repository Star count and file/repo update time (rendered live as data arrives) in GitHub code search results, with dual-date sorting, default-order restore, cross-page scan aggregation, and click to jump to the matching file line.
// @author       micoe
// @license      MIT
// @match        https://github.com/search*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @connect      github.com
// @connect      api.github.com
// @homepageURL  https://github.com/micoe/github-code-search-sorter
// @updateURL    https://raw.githubusercontent.com/micoe/github-code-search-sorter/refs/heads/main/script.user.js
// @downloadURL  https://raw.githubusercontent.com/micoe/github-code-search-sorter/refs/heads/main/script.user.js
// ==/UserScript==

// ⚠️ 维护提醒：上面的基准 @name（中文）必须与历史版本逐字保持一致——用户脚本管理器
// 依赖它匹配已安装的脚本，一旦改动，老用户更新时可能被识别为"新脚本"而出现重复安装。
// 其它语言一律通过 @name:xx / @description:xx 这类本地化标签提供。

(function () {
  'use strict';

  // ========== 多语言（i18n）==========
  // 逻辑只有一份，界面文案按当前语言从字典取。
  // 语言优先级：GM 设置 > 浏览器语言（zh* → 中文，其余 → 英文）。
  // 管理器列表中显示的名称/描述由头部的 @name / @name:en 等本地化元数据标签负责。
  const LANG_KEY = 'lang';
  const LANG_OVERRIDE = GM_getValue(LANG_KEY, '');

  const LANG = (() => {
    if (LANG_OVERRIDE === 'zh' || LANG_OVERRIDE === 'en') return LANG_OVERRIDE;
    const nav = String(navigator.language || navigator.userLanguage || 'en').toLowerCase();
    return nav.indexOf('zh') === 0 ? 'zh' : 'en';
  })();

  const I18N = {
    zh: {
      langAutoSuffix: '（自动）',
      menuSetToken: '⚙️ 设置 GitHub Token',
      menuClearToken: '🗑️ 清除 GitHub Token',
      menuTokenStatus: 'ℹ️ 查看 Token 状态',
      menuScanPages: '📄 设置扫描页数',
      menuLangLabel: (label) => '🌐 界面语言：' + label,
      tokenPrompt: '请输入 GitHub Personal Access Token（仅需 public_repo 权限）：',
      tokenClearConfirm: '确定要清除已保存的 GitHub Token 吗？',
      tokenStatusSet: (prefix) => '已设置 Token：' + prefix + '...\nAPI 速率限制：5000 次/小时',
      tokenStatusUnset: '未设置 Token。\n当前使用匿名 API，速率限制为 60 次/小时，建议设置 Token。',
      scanPagesPrompt: (cur) => '扫描前几页？（1-20，当前 ' + cur + '）',
      scanPagesSet: (n) => '已设置为扫描前 ' + n + ' 页',
      scanPagesInvalid: '请输入 1-20 之间的整数',
      langPrompt: (cur) => '输入语言 / Enter language：zh、en 或 auto（跟随浏览器）\n当前：' + cur,
      langInvalid: '请输入 zh、en 或 auto',
      badgeStarsTitle: 'Star 数',
      badgeFileTitle: '文件最后更新',
      badgeRepoTitle: '仓库最后更新',
      sortStars: '按 Star 排序',
      sortFileDate: '按文件更新日期排序',
      sortRepoDate: '按仓库更新日期排序',
      sortReset: '恢复默认排序',
      scanButton: (n) => '📊 扫描 ' + n + ' 页并汇总',
      panelTitle: '📊 扫描结果',
      panelTitleCount: (files, repos) => '📊 扫描结果（' + files + ' 文件 / ' + repos + ' 仓库）',
      panelSortStars: '⭐ Star',
      panelSortFile: '📄 文件更新',
      panelSortRepo: '🕒 仓库更新',
      panelRescan: '重新扫描',
      scanningPages: (p, total) => '正在扫描第 ' + p + ' / ' + total + ' 页…',
      fetchingData: (done, total) => '正在获取 Star 与更新时间 ' + done + ' / ' + total + '…',
      statsSummary: (pages, items, files, repos) =>
        '共扫描 <b>' + pages + '</b> 页 · 结果项 <b>' + items + '</b> 个 · 唯一文件 <b>' +
        files + '</b> · 唯一仓库 <b>' + repos + '</b>',
      statsPageOk: (page, n) => 'P.' + page + ':' + n + '项',
      statsPageError: (page) => 'P.' + page + ':✕',
      scanningBusy: '正在扫描中，请稍候…',
      notSearchPage: '当前页面不是搜索结果页',
      noTokenWarning: (pages) =>
        '未设置 GitHub Token，扫描 ' + pages + ' 页可能触发匿名 API 限流（60 次/小时）。\n' +
        '每个文件还需要一次 Commits API 调用以获取文件更新日期，消耗会更大。\n' +
        '建议先用菜单命令「⚙️ 设置 GitHub Token」配置 Token。\n\n是否继续？',
      noFilesExtracted: '未从页面提取到任何文件。可能是 GitHub 页面结构变化或搜索结果为空。',
      scanFailed: (msg) => '扫描失败：' + msg,
    },
    en: {
      langAutoSuffix: ' (auto)',
      menuSetToken: '⚙️ Set GitHub Token',
      menuClearToken: '🗑️ Clear GitHub Token',
      menuTokenStatus: 'ℹ️ View Token Status',
      menuScanPages: '📄 Set Scan Pages',
      menuLangLabel: (label) => '🌐 UI Language: ' + label,
      tokenPrompt: 'Enter your GitHub Personal Access Token (public_repo scope only):',
      tokenClearConfirm: 'Are you sure you want to clear the saved GitHub Token?',
      tokenStatusSet: (prefix) => 'Token set: ' + prefix + '...\nAPI rate limit: 5000 requests/hour',
      tokenStatusUnset: 'No Token set.\nUsing anonymous API with a rate limit of 60 requests/hour. Setting a Token is recommended.',
      scanPagesPrompt: (cur) => 'How many pages to scan? (1-20, current ' + cur + ')',
      scanPagesSet: (n) => 'Set to scan the first ' + n + ' pages',
      scanPagesInvalid: 'Please enter an integer between 1 and 20',
      langPrompt: (cur) => 'Enter language: zh, en, or auto (follow browser)\nCurrent: ' + cur,
      langInvalid: 'Please enter zh, en or auto',
      badgeStarsTitle: 'Star count',
      badgeFileTitle: 'File last updated',
      badgeRepoTitle: 'Repository last updated',
      sortStars: 'Sort by Stars',
      sortFileDate: 'Sort by File Date',
      sortRepoDate: 'Sort by Repo Date',
      sortReset: 'Restore Default Order',
      scanButton: (n) => '📊 Scan ' + n + ' Pages & Aggregate',
      panelTitle: '📊 Scan Results',
      panelTitleCount: (files, repos) => '📊 Scan Results (' + files + ' files / ' + repos + ' repos)',
      panelSortStars: '⭐ Stars',
      panelSortFile: '📄 File Updated',
      panelSortRepo: '🕒 Repo Updated',
      panelRescan: 'Rescan',
      scanningPages: (p, total) => 'Scanning page ' + p + ' / ' + total + '…',
      fetchingData: (done, total) => 'Fetching Stars & dates ' + done + ' / ' + total + '…',
      statsSummary: (pages, items, files, repos) =>
        'Scanned <b>' + pages + '</b> pages · <b>' + items + '</b> result items · <b>' +
        files + '</b> unique files · <b>' + repos + '</b> unique repos',
      statsPageOk: (page, n) => 'P.' + page + ':' + n + ' items',
      statsPageError: (page) => 'P.' + page + ':✕',
      scanningBusy: 'Scanning in progress, please wait…',
      notSearchPage: 'Current page is not a search results page',
      noTokenWarning: (pages) =>
        'No GitHub Token set. Scanning ' + pages + ' pages may trigger the anonymous API rate limit (60 requests/hour).\n' +
        'Each file also requires an extra Commits API call to get its update date, so usage is higher.\n' +
        'It is recommended to configure a Token first via the menu command "⚙️ Set GitHub Token".\n\nContinue?',
      noFilesExtracted: 'No files were extracted from the pages. The GitHub page structure may have changed or the search results are empty.',
      scanFailed: (msg) => 'Scan failed: ' + msg,
    },
  };

  function t(key, ...args) {
    const table = I18N[LANG] || I18N.en;
    const v = table[key];
    if (typeof v === 'function') return v(...args);
    return v != null ? v : key;
  }

  // 当前语言标签（未手动指定时标注"自动"）
  function langLabel() {
    const base = LANG === 'zh' ? '中文' : 'English';
    return LANG_OVERRIDE ? base : base + t('langAutoSuffix');
  }

  // ========== Token 管理 ==========
  let GITHUB_TOKEN = GM_getValue('github_token', '');
  const CACHE_PREFIX = 'ghcs_star_updated_';
  const FILE_CACHE_PREFIX = 'ghcs_file_commit_';

  function clearRepoCache() {
    try {
      const keys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && (k.startsWith(CACHE_PREFIX) || k.startsWith(FILE_CACHE_PREFIX))) keys.push(k);
      }
      keys.forEach((k) => sessionStorage.removeItem(k));
    } catch (e) {}
  }

  GM_registerMenuCommand(t('menuSetToken'), () => {
    const token = prompt(t('tokenPrompt'), GITHUB_TOKEN);
    if (token !== null) {
      GITHUB_TOKEN = token.trim();
      GM_setValue('github_token', GITHUB_TOKEN);
      clearRepoCache();
      location.reload();
    }
  });

  GM_registerMenuCommand(t('menuClearToken'), () => {
    if (confirm(t('tokenClearConfirm'))) {
      GITHUB_TOKEN = '';
      GM_setValue('github_token', '');
      clearRepoCache();
      location.reload();
    }
  });

  GM_registerMenuCommand(t('menuTokenStatus'), () => {
    if (GITHUB_TOKEN) {
      alert(t('tokenStatusSet', GITHUB_TOKEN.slice(0, 8)));
    } else {
      alert(t('tokenStatusUnset'));
    }
  });

  GM_registerMenuCommand(t('menuScanPages'), () => {
    const cur = GM_getValue('scan_pages', 3);
    const n = prompt(t('scanPagesPrompt', cur), cur);
    if (n !== null) {
      const num = parseInt(n, 10);
      if (num >= 1 && num <= 20) {
        GM_setValue('scan_pages', num);
        CONFIG.scanPages = num;
        alert(t('scanPagesSet', num));
      } else {
        alert(t('scanPagesInvalid'));
      }
    }
  });

  GM_registerMenuCommand(t('menuLangLabel', langLabel()), () => {
    const cur = LANG_OVERRIDE || 'auto';
    const input = prompt(t('langPrompt', cur), cur);
    if (input === null) return;
    const v = input.trim().toLowerCase();
    if (v === 'auto' || v === '') {
      GM_setValue(LANG_KEY, '');
      location.reload();
    } else if (v === 'zh' || v === 'en') {
      GM_setValue(LANG_KEY, v);
      location.reload();
    } else {
      alert(t('langInvalid'));
    }
  });

  // ========== 配置 ==========
  const CONFIG = {
    cacheTTL: 10 * 60 * 1000,
    batchSize: 5,
    scanPages: Math.max(1, Math.min(20, parseInt(GM_getValue('scan_pages', 3), 10) || 3)),
  };

  // ========== 工具函数 ==========
  const cacheKey = (repo) => `${CACHE_PREFIX}${repo}`;
  const fileCacheKey = (repo, path) => `${FILE_CACHE_PREFIX}${repo}\u0000${path}`;

  const SYSTEM_PATHS = new Set([
    'search', 'settings', 'login', 'signup', 'logout', 'notifications',
    'explore', 'topics', 'trending', 'sponsors', 'marketplace', 'orgs',
    'users', 'apps', 'features', 'pricing', 'about', 'contact', 'security',
    'enterprise', 'collections', 'events', 'new', 'issues', 'pulls',
  ]);

  function extractRepoFullName(container) {
    const links = container.querySelectorAll('a[href]');

    for (const link of links) {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('http')) continue;
      const m = href.match(/^\/([^/]+)\/([^/]+)\/(?:blob|tree)\//);
      if (m) return `${m[1]}/${m[2]}`;
    }

    for (const link of links) {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('http')) continue;
      const m = href.match(/^\/([^/]+)\/([^/]+)\/?$/);
      if (m) {
        const owner = m[1];
        if (SYSTEM_PATHS.has(owner.toLowerCase())) continue;
        if (owner.startsWith('.')) continue;
        return `${owner}/${m[2]}`;
      }
    }

    return null;
  }

  function extractFilePath(container) {
    const links = container.querySelectorAll('a[href]');
    for (const link of links) {
      const href = link.getAttribute('href');
      if (!href) continue;
      const m = href.match(/^\/([^/]+)\/([^/]+)\/blob\/[^/]+\/([^?#]+)/);
      if (m) return decodeURIComponent(m[3]);
    }
    return null;
  }

  // 提取行号锚点，返回 { start, end } 或 null
  // 支持 #L10 或 #L10-L20
  function extractLineRange(container) {
    const links = container.querySelectorAll('a[href]');
    for (const link of links) {
      const href = link.getAttribute('href');
      if (!href) continue;
      // 仅处理 blob 链接
      if (!/^\/([^/]+)\/([^/]+)\/blob\//.test(href)) continue;
      const m = href.match(/#L(\d+)(?:-L(\d+))?/);
      if (m) {
        return { start: parseInt(m[1], 10), end: m[2] ? parseInt(m[2], 10) : null };
      }
    }
    return null;
  }

  function getCached(repo) {
    try {
      const raw = sessionStorage.getItem(cacheKey(repo));
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - data.ts > CONFIG.cacheTTL) {
        sessionStorage.removeItem(cacheKey(repo));
        return null;
      }
      return data.value;
    } catch (e) {
      return null;
    }
  }

  function setCache(repo, value) {
    try {
      sessionStorage.setItem(
        cacheKey(repo),
        JSON.stringify({ ts: Date.now(), value })
      );
    } catch (e) {}
  }

  function getFileCached(repo, path) {
    try {
      const raw = sessionStorage.getItem(fileCacheKey(repo, path));
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - data.ts > CONFIG.cacheTTL) {
        sessionStorage.removeItem(fileCacheKey(repo, path));
        return null;
      }
      return data.value;
    } catch (e) {
      return null;
    }
  }

  function setFileCache(repo, path, value) {
    try {
      sessionStorage.setItem(
        fileCacheKey(repo, path),
        JSON.stringify({ ts: Date.now(), value })
      );
    } catch (e) {}
  }

  function formatDate(isoString) {
    if (!isoString) return 'N/A';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'N/A';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function formatStars(n) {
    if (n == null) return 'N/A';
    if (n >= 1000) {
      return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return String(n);
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ========== API ==========
  function fetchRepoInfo(repoFullName) {
    return new Promise((resolve) => {
      const cached = getCached(repoFullName);
      if (cached) return resolve(cached);

      const headers = { Accept: 'application/vnd.github+json' };
      if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;

      GM_xmlhttpRequest({
        method: 'GET',
        url: `https://api.github.com/repos/${repoFullName}`,
        headers,
        onload: (res) => {
          try {
            const data = JSON.parse(res.responseText);
            if (data && data.full_name) {
              const info = { stars: data.stargazers_count, updated: data.updated_at };
              setCache(repoFullName, info);
              resolve(info);
            } else {
              resolve({ stars: null, updated: null });
            }
          } catch (e) {
            resolve({ stars: null, updated: null });
          }
        },
        onerror: () => resolve({ stars: null, updated: null }),
      });
    });
  }

  function fetchFileLastCommit(repoFullName, filePath) {
    return new Promise((resolve) => {
      if (!repoFullName || !filePath) return resolve(null);

      const cached = getFileCached(repoFullName, filePath);
      if (cached) return resolve(cached);

      const headers = { Accept: 'application/vnd.github+json' };
      if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;

      GM_xmlhttpRequest({
        method: 'GET',
        url: `https://api.github.com/repos/${repoFullName}/commits?path=${encodeURIComponent(filePath)}&per_page=1`,
        headers,
        onload: (res) => {
          try {
            const data = JSON.parse(res.responseText);
            if (Array.isArray(data) && data.length > 0) {
              const commitDate = data[0].commit.committer.date;
              setFileCache(repoFullName, filePath, commitDate);
              resolve(commitDate);
            } else {
              resolve(null);
            }
          } catch (e) {
            resolve(null);
          }
        },
        onerror: () => resolve(null),
      });
    });
  }

  // ========== 创建徽章 ==========
  // 徽章先以占位形式挂上（⭐ … / 📄 … / 🕒 …），数据到达后逐项填充，
  // 这样用户能立刻看到反馈，而不必等所有请求都完成。
  function createBadge() {
    const badge = document.createElement('span');
    badge.className = 'ghcs-extra-info';
    badge.style.cssText = `
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 2px 8px;
      font-size: 11px;
      line-height: 1.5;
      color: var(--fgColor-muted, #57606a);
      background: var(--bgColor-muted, #f6f8fa);
      border-radius: 6px;
      border: 1px solid var(--borderColor-default, #d0d7de);
      white-space: nowrap;
      z-index: 10;
      pointer-events: auto;
      opacity: 0.6;
    `;
    badge.innerHTML = `
      <span class="ghcs-stars" title="${escapeHtml(t('badgeStarsTitle'))}">⭐ …</span>
      <span class="ghcs-date-file" title="${escapeHtml(t('badgeFileTitle'))}">📄 …</span>
      <span class="ghcs-date-repo" title="${escapeHtml(t('badgeRepoTitle'))}" style="display:none;">🕒 …</span>
    `;
    return badge;
  }

  // Star 与文件日期都到位后恢复正常不透明度
  function refreshBadgePending(badge) {
    badge.style.opacity =
      badge.dataset.ghcsStars === '1' && badge.dataset.ghcsFile === '1' ? '' : '0.6';
  }

  // ========== headerBar 辅助 ==========
  function findOwnHeaderBar(el) {
    for (const child of el.children) {
      if (child.tagName === 'DIV' && /headerBar/.test(child.className || '')) {
        return child;
      }
    }
    return null;
  }

  function findBadge(el) {
    const hb = findOwnHeaderBar(el);
    if (!hb) return null;
    for (const c of hb.children) {
      if (c.classList && c.classList.contains('ghcs-extra-info')) return c;
    }
    return null;
  }

  // 立即挂载占位徽章（不等数据），返回徽章元素
  function ensureBadge(el) {
    const headerBar = findOwnHeaderBar(el);
    if (!headerBar) return null;

    for (const c of headerBar.children) {
      if (c.classList && c.classList.contains('ghcs-extra-info')) return c;
    }

    const pos = getComputedStyle(headerBar).position;
    if (pos === 'static') {
      headerBar.style.setProperty('position', 'relative', 'important');
    }

    if (!headerBar.dataset.ghcsPadded) {
      const curPr = parseInt(getComputedStyle(headerBar).paddingRight, 10) || 0;
      if (curPr < 160) {
        headerBar.style.setProperty('padding-right', '160px', 'important');
      }
      headerBar.dataset.ghcsPadded = '1';
    }

    const badge = createBadge();
    headerBar.appendChild(badge);
    return badge;
  }

  // 填充 Star 数与仓库更新时间
  function setBadgeRepoInfo(el, info) {
    const badge = findBadge(el);
    if (!badge) return;
    const starsEl = badge.querySelector('.ghcs-stars');
    const repoDateEl = badge.querySelector('.ghcs-date-repo');
    if (starsEl) starsEl.textContent = '⭐ ' + formatStars(info ? info.stars : null);
    if (repoDateEl) repoDateEl.textContent = '🕒 ' + formatDate(info ? info.updated : null);
    badge.dataset.ghcsStars = '1';
    refreshBadgePending(badge);
  }

  // 填充文件最后提交日期
  function setBadgeFileDate(el, date) {
    const badge = findBadge(el);
    if (!badge) return;
    const fileEl = badge.querySelector('.ghcs-date-file');
    if (fileEl) fileEl.textContent = '📄 ' + (date ? formatDate(date) : 'N/A');
    badge.dataset.ghcsFile = '1';
    refreshBadgePending(badge);
  }

  function readOwnBadge(el) {
    const hb = findOwnHeaderBar(el);
    if (!hb) return null;
    for (const c of hb.children) {
      if (c.classList && c.classList.contains('ghcs-extra-info')) {
        const text = c.textContent;
        let stars = 0, repoDate = 0, fileDate = 0;
        const sm = text.match(/⭐\s*([\d.]+k?)/);
        if (sm) {
          let v = sm[1];
          stars = v.endsWith('k') ? parseFloat(v) * 1000 : parseInt(v, 10) || 0;
        }
        const rm = text.match(/🕒\s*([\d-]+)/);
        if (rm) repoDate = new Date(rm[1]).getTime() || 0;
        const fm = text.match(/📄\s*([\d-]+)/);
        if (fm) fileDate = new Date(fm[1]).getTime() || 0;
        return {
          stars,
          repoDate,
          fileDate,
          starsReady: c.dataset.ghcsStars === '1',
          fileReady: c.dataset.ghcsFile === '1',
        };
      }
    }
    return null;
  }

  function updateBadgeDateDisplay(mode) {
    const all = document.querySelectorAll('div[class*="codeResultWrapper"] .ghcs-extra-info');
    all.forEach((badge) => {
      const fileSpan = badge.querySelector('.ghcs-date-file');
      const repoSpan = badge.querySelector('.ghcs-date-repo');
      if (!fileSpan || !repoSpan) return;
      if (mode === 'repoDate') {
        fileSpan.style.display = 'none';
        repoSpan.style.display = 'inline';
      } else {
        fileSpan.style.display = 'inline';
        repoSpan.style.display = 'none';
      }
    });
  }

  // ========== 原始位置记录 ==========
  const ORIGINAL_POSITION = new WeakMap();

  function ensureOriginalCaptured() {
    const all = document.querySelectorAll('div[class*="codeResultWrapper"]');
    if (all.length === 0) return;

    let maxIdx = 0;
    all.forEach((el) => {
      const o = ORIGINAL_POSITION.get(el);
      if (o && o.index > maxIdx) maxIdx = o.index;
    });

    all.forEach((el) => {
      if (!ORIGINAL_POSITION.has(el)) {
        ORIGINAL_POSITION.set(el, {
          parent: el.parentNode,
          nextSibling: el.nextSibling,
          index: maxIdx++,
        });
      }
    });
  }

  // ========== 并发池 & 失败退避 ==========
  // 保持有限并发（不触发限流），同时每个任务一完成就回调，便于实时刷新 UI。
  function runPool(items, limit, worker, onProgress) {
    return new Promise((resolve) => {
      const total = items.length;
      if (total === 0) return resolve();

      let next = 0;
      let done = 0;
      let active = 0;

      const launch = () => {
        while (active < limit && next < total) {
          const item = items[next++];
          active++;
          Promise.resolve()
            .then(() => worker(item))
            .catch((e) => console.warn('[ghcs] task failed:', e))
            .then(() => {
              active--;
              done++;
              if (onProgress) {
                try { onProgress(done, total); } catch (e) {}
              }
              if (done === total) resolve();
              else launch();
            });
        }
      };

      launch();
    });
  }

  // 失败/限流的重试退避，避免被 MutationObserver 反复触发重试
  const FAIL_BACKOFF_MS = 60 * 1000;
  const failedRepoAt = new Map();
  const failedFileAt = new Map();
  const inFlightRepos = new Set();
  const inFlightFiles = new Set();

  function inBackoff(map, key) {
    const t = map.get(key);
    return t != null && Date.now() - t < FAIL_BACKOFF_MS;
  }

  // ========== 实时增量抓取并更新 UI ==========
  let dataVersion = 0;        // 数据/徽章变化版本号
  let lastSortedVersion = -1; // 上次排序时的版本号（避免排序自身触发死循环）
  let annotateRunning = false;
  let annotateAgain = false;
  let resortTimer = null;
  let resortPending = false;

  // 节流排序：数据持续到达时最多每 500ms 重排一次，避免元素反复跳动
  function scheduleResort() {
    if (resortTimer) { resortPending = true; return; }
    resortTimer = setTimeout(() => {
      resortTimer = null;
      if (currentSort && dataVersion !== lastSortedVersion) applySort();
      if (resortPending) { resortPending = false; scheduleResort(); }
    }, 500);
  }

  async function annotateResults() {
    if (annotateRunning) { annotateAgain = true; return; }
    annotateRunning = true;
    try {
      do {
        annotateAgain = false;
        await annotateOnce();
      } while (annotateAgain);
    } finally {
      annotateRunning = false;
    }
  }

  async function annotateOnce() {
    const items = Array.from(document.querySelectorAll('div[class*="codeResultWrapper"]'));
    if (items.length === 0) return;

    const repoEls = new Map(); // repo -> [el]
    const fileEls = new Map(); // repo\0path -> { repo, filePath, els }

    items.forEach((el) => {
      const repo = extractRepoFullName(el);
      if (!repo) return;

      const existed = !!findBadge(el);
      const badge = ensureBadge(el); // 立刻挂占位徽章，不等任何请求
      if (!badge) return;
      if (!existed) dataVersion++;

      if (badge.dataset.ghcsStars !== '1') {
        if (!repoEls.has(repo)) repoEls.set(repo, []);
        repoEls.get(repo).push(el);
      }

      const filePath = extractFilePath(el);
      if (!filePath) {
        // 没有文件路径（例如只匹配到仓库），直接标记完成
        if (badge.dataset.ghcsFile !== '1') { setBadgeFileDate(el, null); dataVersion++; }
        return;
      }

      if (badge.dataset.ghcsFile !== '1') {
        const key = repo + '\u0000' + filePath;
        if (!fileEls.has(key)) fileEls.set(key, { repo, filePath, els: [] });
        fileEls.get(key).els.push(el);
      }
    });

    // 按钮与日期显示不依赖数据，先就位
    ensureOriginalCaptured();
    addSortButtons();
    updateBadgeDateDisplay(currentSort === 'repoDate' ? 'repoDate' : 'fileDate');

    const tasks = [];

    // 仓库信息任务优先入队，Star 会最先显示出来
    repoEls.forEach((els, repo) => {
      if (inFlightRepos.has(repo) || inBackoff(failedRepoAt, repo)) return;
      inFlightRepos.add(repo);
      tasks.push(async () => {
        const info = await fetchRepoInfo(repo);
        inFlightRepos.delete(repo);
        if (info.stars == null) failedRepoAt.set(repo, Date.now());
        else failedRepoAt.delete(repo);
        els.forEach((el) => setBadgeRepoInfo(el, info));
        dataVersion++;
        scheduleResort();
      });
    });

    fileEls.forEach((task, key) => {
      if (inFlightFiles.has(key) || inBackoff(failedFileAt, key)) return;
      inFlightFiles.add(key);
      tasks.push(async () => {
        const date = await fetchFileLastCommit(task.repo, task.filePath);
        inFlightFiles.delete(key);
        if (!date) failedFileAt.set(key, Date.now());
        else failedFileAt.delete(key);
        task.els.forEach((el) => setBadgeFileDate(el, date));
        dataVersion++;
        scheduleResort();
      });
    });

    if (tasks.length === 0) return;

    // 单池调度：仓库与文件任务混跑，任一完成即刷新对应徽章
    await runPool(tasks, CONFIG.batchSize, (fn) => fn());
  }

  // ========== 页内排序 ==========
  let currentSort = null;
  let sortAsc = false;

  function addSortButtons() {
    if (document.querySelector('.ghcs-sort-bar')) return;

    const list = document.querySelector('[data-testid="results-list"]');
    if (!list) return;

    const bar = document.createElement('div');
    bar.className = 'ghcs-sort-bar';
    bar.style.cssText = `
      display: flex;
      gap: 8px;
      padding: 8px 0;
      margin-bottom: 8px;
      border-bottom: 1px solid var(--borderColor-default, #d0d7de);
      flex-wrap: wrap;
    `;

    const btnStyle = `
      cursor: pointer;
      padding: 4px 12px;
      border-radius: 6px;
      border: 1px solid var(--borderColor-default, #d0d7de);
      background-color: var(--bgColor-muted, #f6f8fa);
      color: var(--fgColor-default, #24292f);
      font-weight: 500;
      font-size: 12px;
    `;

    const btnStars = document.createElement('button');
    btnStars.textContent = t('sortStars');
    btnStars.style.cssText = btnStyle;

    const btnFileDate = document.createElement('button');
    btnFileDate.textContent = t('sortFileDate');
    btnFileDate.style.cssText = btnStyle;

    const btnRepoDate = document.createElement('button');
    btnRepoDate.textContent = t('sortRepoDate');
    btnRepoDate.style.cssText = btnStyle;

    const btnReset = document.createElement('button');
    btnReset.textContent = t('sortReset');
    btnReset.style.cssText = btnStyle + 'background-color: var(--bgColor-default, #fff);';

    const btnScan = document.createElement('button');
    btnScan.textContent = t('scanButton', CONFIG.scanPages);
    btnScan.style.cssText = btnStyle + 'background-color: #0969da; color: #fff; border-color: #0969da;';

    btnStars.addEventListener('click', () => toggleSort('stars'));
    btnFileDate.addEventListener('click', () => toggleSort('fileDate'));
    btnRepoDate.addEventListener('click', () => toggleSort('repoDate'));
    btnReset.addEventListener('click', () => restoreDefaultOrder());
    btnScan.addEventListener('click', () => scanAllPages());

    bar.appendChild(btnStars);
    bar.appendChild(btnFileDate);
    bar.appendChild(btnRepoDate);
    bar.appendChild(btnReset);
    bar.appendChild(btnScan);
    list.parentNode.insertBefore(bar, list);
  }

  function toggleSort(field) {
    ensureOriginalCaptured();
    if (currentSort === field) {
      sortAsc = !sortAsc;
    } else {
      currentSort = field;
      sortAsc = false;
    }
    applySort();
  }

  function applySort() {
    const list = document.querySelector('[data-testid="results-list"]');
    if (!list) return;

    const all = Array.from(document.querySelectorAll('div[class*="codeResultWrapper"]'));

    if (currentSort === 'repoDate') {
      updateBadgeDateDisplay('repoDate');
    } else {
      updateBadgeDateDisplay('fileDate');
    }

    if (!currentSort) return;

    const withKeys = [];
    all.forEach((el) => {
      const key = readOwnBadge(el);
      if (key) withKeys.push({ el, ...key });
    });

    if (withKeys.length === 0) return;

    // 当前排序字段的数据是否还没到（Star 与仓库日期同来自仓库信息请求）
    const isPending = (o) => (currentSort === 'fileDate' ? !o.fileReady : !o.starsReady);

    withKeys.sort((a, b) => {
      // 数据还没到的项始终排在最后，避免排序过程中来回跳动
      const pa = isPending(a);
      const pb = isPending(b);
      if (pa !== pb) return pa ? 1 : -1;

      let va, vb;
      if (currentSort === 'stars') { va = a.stars; vb = b.stars; }
      else if (currentSort === 'fileDate') { va = a.fileDate; vb = b.fileDate; }
      else if (currentSort === 'repoDate') { va = a.repoDate; vb = b.repoDate; }
      else return 0;
      return sortAsc ? va - vb : vb - va;
    });

    withKeys.forEach(({ el }) => list.appendChild(el));

    lastSortedVersion = dataVersion;
  }

  function restoreDefaultOrder() {
    currentSort = null;
    sortAsc = false;

    const all = Array.from(document.querySelectorAll('div[class*="codeResultWrapper"]'));
    all.sort((a, b) => {
      const oa = ORIGINAL_POSITION.get(a);
      const ob = ORIGINAL_POSITION.get(b);
      return (oa ? oa.index : 0) - (ob ? ob.index : 0);
    });

    all.forEach((el) => el.remove());

    for (let i = all.length - 1; i >= 0; i--) {
      const el = all[i];
      const orig = ORIGINAL_POSITION.get(el);
      if (!orig || !orig.parent) continue;

      const parent = orig.parent;
      const nextSibling = orig.nextSibling;

      if (nextSibling && nextSibling.parentNode === parent && nextSibling !== el) {
        parent.insertBefore(el, nextSibling);
      } else {
        parent.appendChild(el);
      }
    }

    updateBadgeDateDisplay('fileDate');
  }

  // ========== 跨页扫描 ==========
  let isScanning = false;
  let scanPanelData = [];
  let scanPanelStats = [];
  // 默认按文件更新时间排序，并在面板上默认显示文件日期
  let scanPanelSort = { field: 'fileUpdated', asc: false };
  // 用户是否主动关闭过面板（避免自动刷新时又把它弹出来）
  let scanPanelUserClosed = false;

  // 面板列表的节流重绘：数据持续到达时最多每 500ms 重排一次
  let scanRerenderTimer = null;
  let scanRerenderPending = false;

  function rerenderScanPanel() {
    if (!scanPanelData.length) return;
    const panel = showScanPanel();
    renderScanPanelResults(scanPanelData, scanPanelStats, { keepProgress: isScanning });
    return panel;
  }

  function scheduleScanRerender() {
    if (scanRerenderTimer) { scanRerenderPending = true; return; }
    scanRerenderTimer = setTimeout(() => {
      scanRerenderTimer = null;
      rerenderScanPanel();
      if (scanRerenderPending) { scanRerenderPending = false; scheduleScanRerender(); }
    }, 500);
  }

  function fetchPageHtml(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        headers: { Accept: 'text/html,application/xhtml+xml' },
        timeout: 20000,
        onload: (res) => {
          if (res.status >= 200 && res.status < 400) resolve(res.responseText);
          else reject(new Error('HTTP ' + res.status));
        },
        onerror: () => reject(new Error('Network error')),
        ontimeout: () => reject(new Error('Timeout')),
      });
    });
  }

  function parseFilesFromHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const wrappers = doc.querySelectorAll('div[class*="codeResultWrapper"]');
    const files = [];
    const repoSet = new Set();
    wrappers.forEach((el) => {
      const r = extractRepoFullName(el);
      if (!r) return;
      const p = extractFilePath(el);
      const lineRange = extractLineRange(el); // 提取行号范围
      files.push({
        repo: r,
        filePath: p,
        lineStart: lineRange ? lineRange.start : null,
        lineEnd: lineRange ? lineRange.end : null,
      });
      repoSet.add(r);
    });
    return { totalItems: wrappers.length, files, uniqueRepos: repoSet.size };
  }

  async function scanAllPages() {
    if (isScanning) {
      alert(t('scanningBusy'));
      return;
    }

    const params = new URLSearchParams(location.search);
    const query = params.get('q');
    if (!query) {
      alert(t('notSearchPage'));
      return;
    }

    isScanning = true;
    scanPanelUserClosed = false;
    showScanPanel(true);

    if (!GITHUB_TOKEN && CONFIG.scanPages > 2) {
      const proceed = confirm(t('noTokenWarning', CONFIG.scanPages));
      if (!proceed) {
        isScanning = false;
        showScanPanel().style.display = 'none';
        return;
      }
    }

    resetScanPanelForNewScan();

    try {
      // key: repo\u0000path\u0000lineStart\u0000lineEnd  ->  Set(pages)
      const fileToPages = new Map();
      const allRepos = new Set();
      const pageStats = [];

      const makeKey = (repo, filePath, lineStart, lineEnd) =>
        repo + '\u0000' + (filePath || '') + '\u0000' + (lineStart || '') + '\u0000' + (lineEnd || '');

      // 页面扫描：0-30%
      for (let p = 1; p <= CONFIG.scanPages; p++) {
        renderScanPanelProgress(
          t('scanningPages', p, CONFIG.scanPages),
          (p - 1) / CONFIG.scanPages * 30
        );

        const url = new URL(location.href);
        url.searchParams.set('p', String(p));

        try {
          const html = await fetchPageHtml(url.toString());
          const { totalItems, files, uniqueRepos } = parseFilesFromHtml(html);
          pageStats.push({ page: p, items: totalItems, unique: uniqueRepos });
          files.forEach(({ repo, filePath, lineStart, lineEnd }) => {
            const key = makeKey(repo, filePath, lineStart, lineEnd);
            if (!fileToPages.has(key)) fileToPages.set(key, new Set());
            fileToPages.get(key).add(p);
            allRepos.add(repo);
          });
        } catch (e) {
          console.warn('[ghcs] failed to scan page ' + p + ':', e);
          pageStats.push({ page: p, items: 0, unique: 0, error: true });
        }
      }

      if (fileToPages.size === 0) {
        renderScanPanelError(t('noFilesExtracted'));
        isScanning = false;
        return;
      }

      // 先把所有文件以占位形式渲染出来（此时还没有 Star / 日期），随后逐条填充
      const fileEntries = Array.from(fileToPages.keys()).map((k) => {
        const parts = k.split('\u0000');
        return {
          key: k,
          repo: parts[0],
          filePath: parts[1] || null,
          lineStart: parts[2] ? parseInt(parts[2], 10) : null,
          lineEnd: parts[3] ? parseInt(parts[3], 10) : null,
        };
      });
      const fileEntriesWithPath = fileEntries.filter((e) => e.filePath);

      const infos = fileEntries.map((e) => ({
        repo: e.repo,
        filePath: e.filePath,
        lineStart: e.lineStart,
        lineEnd: e.lineEnd,
        stars: undefined,        // undefined = 加载中，null = 获取失败/无数据
        repoUpdated: undefined,
        fileUpdated: e.filePath ? undefined : null,
        pages: Array.from(fileToPages.get(e.key)).sort((a, b) => a - b),
      }));

      const infoByKey = new Map();
      const infosByRepo = new Map();
      fileEntries.forEach((e, i) => {
        infoByKey.set(e.key, infos[i]);
        if (!infosByRepo.has(e.repo)) infosByRepo.set(e.repo, []);
        infosByRepo.get(e.repo).push(infos[i]);
      });

      renderScanPanelResults(infos, pageStats, { keepProgress: true });

      // 仓库信息 + 文件提交日期：单池调度，30-100%，每完成一项就刷新面板
      const repoList = Array.from(allRepos);
      const totalTasks = repoList.length + fileEntriesWithPath.length;
      let doneTasks = 0;
      const tick = () => {
        doneTasks++;
        renderScanPanelProgress(
          t('fetchingData', doneTasks, totalTasks),
          30 + (totalTasks ? (doneTasks / totalTasks) * 70 : 70)
        );
        scheduleScanRerender();
      };

      const tasks = repoList.map((repo) => async () => {
        const info = await fetchRepoInfo(repo);
        (infosByRepo.get(repo) || []).forEach((row) => {
          row.stars = info.stars != null ? info.stars : null;
          row.repoUpdated = info.updated || null;
        });
        tick();
      });

      fileEntriesWithPath.forEach((e) => {
        tasks.push(async () => {
          const date = await fetchFileLastCommit(e.repo, e.filePath);
          const row = infoByKey.get(e.key);
          if (row) row.fileUpdated = date || null;
          tick();
        });
      });

      await runPool(tasks, CONFIG.batchSize, (fn) => fn());

      // 全部完成：停掉节流重绘，做一次最终渲染
      clearTimeout(scanRerenderTimer);
      scanRerenderTimer = null;
      scanRerenderPending = false;
      renderScanPanelResults(infos, pageStats, { keepProgress: false });
    } catch (e) {
      console.error(e);
      clearTimeout(scanRerenderTimer);
      scanRerenderTimer = null;
      scanRerenderPending = false;
      renderScanPanelError(t('scanFailed', e.message));
    } finally {
      isScanning = false;
    }
  }

  // ========== 扫描面板 ==========
  function showScanPanel(forceOpen) {
    let panel = document.getElementById('ghcs-scan-panel');
    if (panel) {
      // forceOpen=true 时强制显示（例如用户主动点扫描/重新扫描）
      // 否则如果用户已经点过关闭，就保持隐藏状态
      if (forceOpen || !scanPanelUserClosed) {
        panel.style.display = 'flex';
      }
      return panel;
    }

    panel = document.createElement('div');
    panel.id = 'ghcs-scan-panel';
    panel.style.cssText = `
      position: fixed;
      top: 60px;
      right: 16px;
      width: 480px;
      max-width: calc(100vw - 32px);
      max-height: 80vh;
      background: var(--bgColor-default, #ffffff);
      color: var(--fgColor-default, #24292f);
      border: 1px solid var(--borderColor-default, #d0d7de);
      border-radius: 10px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
      z-index: 2147483000;
      display: flex;
      flex-direction: column;
      font-size: 13px;
      overflow: hidden;
    `;

    panel.innerHTML = `
      <div class="ghcs-sp-header" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid var(--borderColor-default,#d0d7de);background:var(--bgColor-muted,#f6f8fa);">
        <span style="font-weight:600;">${t('panelTitle')}</span>
        <button class="ghcs-sp-close" style="background:transparent;border:none;cursor:pointer;font-size:16px;color:var(--fgColor-muted,#57606a);line-height:1;">✕</button>
      </div>
      <div class="ghcs-sp-stats" style="display:none;padding:6px 12px;font-size:11px;color:var(--fgColor-muted,#57606a);border-bottom:1px solid var(--borderColor-muted,#eaeef2);line-height:1.6;"></div>
      <div class="ghcs-sp-toolbar" style="display:flex;gap:6px;padding:8px 12px;border-bottom:1px solid var(--borderColor-default,#d0d7de);flex-wrap:wrap;">
        <button class="ghcs-sp-sort-stars" style="cursor:pointer;padding:3px 10px;font-size:12px;border-radius:6px;border:1px solid var(--borderColor-default,#d0d7de);background:var(--bgColor-muted,#f6f8fa);color:inherit;">${t('panelSortStars')}</button>
        <button class="ghcs-sp-sort-file" style="cursor:pointer;padding:3px 10px;font-size:12px;border-radius:6px;border:1px solid var(--borderColor-default,#d0d7de);background:var(--bgColor-muted,#f6f8fa);color:inherit;">${t('panelSortFile')}</button>
        <button class="ghcs-sp-sort-repo" style="cursor:pointer;padding:3px 10px;font-size:12px;border-radius:6px;border:1px solid var(--borderColor-default,#d0d7de);background:var(--bgColor-muted,#f6f8fa);color:inherit;">${t('panelSortRepo')}</button>
        <button class="ghcs-sp-rescan" style="cursor:pointer;padding:3px 10px;font-size:12px;border-radius:6px;border:1px solid var(--borderColor-default,#d0d7de);background:var(--bgColor-muted,#f6f8fa);color:inherit;margin-left:auto;">${t('panelRescan')}</button>
      </div>
      <div class="ghcs-sp-progress" style="display:none;padding:8px 12px;border-bottom:1px solid var(--borderColor-default,#d0d7de);">
        <div class="ghcs-sp-progress-text" style="margin-bottom:4px;color:var(--fgColor-muted,#57606a);font-size:12px;"></div>
        <div style="height:6px;background:var(--bgColor-muted,#f6f8fa);border-radius:3px;overflow:hidden;">
          <div class="ghcs-sp-progress-bar" style="height:100%;width:0%;background:#0969da;transition:width 0.2s;"></div>
        </div>
      </div>
      <div class="ghcs-sp-list" style="flex:1;overflow-y:auto;padding:4px 0;"></div>
    `;

    document.body.appendChild(panel);

    panel.querySelector('.ghcs-sp-close').addEventListener('click', () => {
      panel.style.display = 'none';
      scanPanelUserClosed = true;
    });
    panel.querySelector('.ghcs-sp-sort-stars').addEventListener('click', () => {
      if (scanPanelSort.field === 'stars') scanPanelSort.asc = !scanPanelSort.asc;
      else { scanPanelSort.field = 'stars'; scanPanelSort.asc = false; }
      rerenderScanPanel();
    });
    panel.querySelector('.ghcs-sp-sort-file').addEventListener('click', () => {
      if (scanPanelSort.field === 'fileUpdated') scanPanelSort.asc = !scanPanelSort.asc;
      else { scanPanelSort.field = 'fileUpdated'; scanPanelSort.asc = false; }
      rerenderScanPanel();
    });
    panel.querySelector('.ghcs-sp-sort-repo').addEventListener('click', () => {
      if (scanPanelSort.field === 'repoUpdated') scanPanelSort.asc = !scanPanelSort.asc;
      else { scanPanelSort.field = 'repoUpdated'; scanPanelSort.asc = false; }
      rerenderScanPanel();
    });
    panel.querySelector('.ghcs-sp-rescan').addEventListener('click', () => {
      scanAllPages();
    });

    return panel;
  }

  // 新一轮扫描开始前清空面板（保留面板框架与工具栏）
  function resetScanPanelForNewScan() {
    const panel = showScanPanel(true);
    panel.querySelector('.ghcs-sp-list').innerHTML = '';
    panel.querySelector('.ghcs-sp-stats').style.display = 'none';
    panel.querySelector('.ghcs-sp-stats').innerHTML = '';
    panel.querySelector('.ghcs-sp-progress').style.display = 'block';
    panel.querySelector('.ghcs-sp-progress-text').textContent = '';
    panel.querySelector('.ghcs-sp-progress-bar').style.width = '0%';
    panel.querySelector('.ghcs-sp-header span').textContent = t('panelTitle');
    scanPanelData = [];
    scanPanelStats = [];
  }

  function renderScanPanelProgress(text, percent) {
    const panel = showScanPanel();
    panel.querySelector('.ghcs-sp-progress').style.display = 'block';
    panel.querySelector('.ghcs-sp-progress-text').textContent = text;
    panel.querySelector('.ghcs-sp-progress-bar').style.width = Math.min(100, percent) + '%';
  }

  function renderScanPanelError(msg) {
    const panel = showScanPanel();
    panel.querySelector('.ghcs-sp-progress').style.display = 'none';
    panel.querySelector('.ghcs-sp-list').innerHTML =
      '<div style="padding:16px;color:var(--fgColor-danger,#cf222e);">' + escapeHtml(msg) + '</div>';
  }

  // 构造 GitHub 文件 URL，包含行号锚点（如果存在）
  function buildFileUrl(repo, filePath, lineStart, lineEnd) {
    if (!filePath) return 'https://github.com/' + repo;
    const encodedPath = filePath
      .split('/')
      .map((seg) => encodeURIComponent(seg))
      .join('/');
    let url = 'https://github.com/' + repo + '/blob/HEAD/' + encodedPath;
    if (lineStart) {
      if (lineEnd && lineEnd !== lineStart) {
        url += '#L' + lineStart + '-L' + lineEnd;
      } else {
        url += '#L' + lineStart;
      }
    }
    return url;
  }

  // 排序键：返回 null 表示该字段还在加载中（排到最后）
  function scanSortValue(info, field) {
    if (field === 'stars') {
      if (info.stars === undefined) return null;
      return info.stars == null ? 0 : info.stars;
    }
    if (field === 'repoUpdated') {
      if (info.repoUpdated === undefined) return null;
      return info.repoUpdated ? new Date(info.repoUpdated).getTime() : 0;
    }
    if (info.fileUpdated === undefined) return null;
    return info.fileUpdated ? new Date(info.fileUpdated).getTime() : 0;
  }

  function renderScanPanelResults(infos, stats, opts) {
    const keepProgress = !!(opts && opts.keepProgress);
    scanPanelData = infos;
    scanPanelStats = stats || [];
    const panel = showScanPanel();
    panel._stats = scanPanelStats;
    if (!keepProgress) panel.querySelector('.ghcs-sp-progress').style.display = 'none';

    // ---- 统计 ----
    const statsEl = panel.querySelector('.ghcs-sp-stats');
    if (stats && stats.length > 0) {
      const totalItems = stats.reduce((s, x) => s + (x.items || 0), 0);
      const uniqueRepos = new Set(infos.map((i) => i.repo)).size;
      const perPage = stats.map((x) =>
        x.error ? t('statsPageError', x.page) : t('statsPageOk', x.page, x.items)
      ).join('  ·  ');
      statsEl.innerHTML =
        '<div>' + t('statsSummary', stats.length, totalItems, infos.length, uniqueRepos) + '</div>' +
        '<div style="opacity:0.8;margin-top:2px;">' + perPage + '</div>';
      statsEl.style.display = 'block';
    } else {
      statsEl.style.display = 'none';
    }

    // ---- 列表 ----
    const list = panel.querySelector('.ghcs-sp-list');
    list.innerHTML = '';

    const showRepoDate = scanPanelSort.field === 'repoUpdated';

    const sorted = [...infos].sort((a, b) => {
      const va = scanSortValue(a, scanPanelSort.field);
      const vb = scanSortValue(b, scanPanelSort.field);
      // 还在加载的项始终排在最后
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return scanPanelSort.asc ? va - vb : vb - va;
    });

    sorted.forEach((info) => {
      const row = document.createElement('div');
      row.style.cssText = `
        padding:8px 12px;
        border-bottom:1px solid var(--borderColor-muted,#eaeef2);
        cursor:pointer;
        display:flex;flex-direction:column;gap:3px;
      `;
      const pagesText = info.pages.map((p) => 'P.' + p).join(' / ');
      const dateIcon = showRepoDate ? '🕒' : '📄';
      const dateValue = showRepoDate ? info.repoUpdated : info.fileUpdated;
      // undefined = 加载中，显示 …；null = 无数据，显示 N/A
      const starsText = info.stars === undefined ? '…' : formatStars(info.stars);
      const dateText = dateValue === undefined ? '…' : formatDate(dateValue);

      const safeRepo = escapeHtml(info.repo);
      const safePath = escapeHtml(info.filePath || '');

      // 在路径后显示行号（如果有）
      let pathSuffix = '';
      if (info.lineStart) {
        pathSuffix = info.lineEnd && info.lineEnd !== info.lineStart
          ? ' : L' + info.lineStart + '-L' + info.lineEnd
          : ' : L' + info.lineStart;
      }

      const pathHtml = info.filePath
        ? `<span style="font-size:11px;color:var(--fgColor-muted,#57606a);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;" title="${safePath}${pathSuffix}">${safePath}${pathSuffix}</span>`
        : '';

      row.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <span style="font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${safeRepo}</span>
          <span style="font-size:11px;color:var(--fgColor-muted,#57606a);flex-shrink:0;">${pagesText}</span>
        </div>
        ${pathHtml}
        <div style="display:flex;gap:12px;font-size:12px;color:var(--fgColor-muted,#57606a);">
          <span>⭐ ${starsText}</span>
          <span>${dateIcon} ${dateText}</span>
        </div>
      `;

      // 计算点击后要打开的目标 URL：直接打开对应文件并定位到匹配行
      const targetUrl = buildFileUrl(info.repo, info.filePath, info.lineStart, info.lineEnd);
      row.title = targetUrl;

      row.addEventListener('click', (ev) => {
        // 允许 Ctrl/Cmd/Shift/中键等浏览器默认行为（用户可能想强制在新标签打开）
        if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button === 1) return;
        window.open(targetUrl, '_blank', 'noopener');
      });

      row.addEventListener('mouseenter', () => { row.style.background = 'var(--bgColor-muted,#f6f8fa)'; });
      row.addEventListener('mouseleave', () => { row.style.background = ''; });
      list.appendChild(row);
    });

    const uniqueRepos = new Set(infos.map((i) => i.repo)).size;
    panel.querySelector('.ghcs-sp-header span').textContent =
      t('panelTitleCount', infos.length, uniqueRepos);
  }

  // ========== 监听页面变化 ==========
  let observer = null;
  let debounceTimer = null;

  function startObserve() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        annotateResults();
        // 只有数据/徽章真的变化过才重排，避免排序本身触发无限循环
        if (currentSort && dataVersion !== lastSortedVersion) applySort();
      }, 800);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ========== 初始化 ==========
  function init() {
    if (!/\/search/.test(location.pathname)) return;
    const params = new URLSearchParams(location.search);
    if (params.get('type') !== 'code') return;

    annotateResults();
    startObserve();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(init, 500);
    }
  }).observe(document.body, { childList: true, subtree: true });
})();