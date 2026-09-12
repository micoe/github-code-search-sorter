// ==UserScript==
// @name         GitHub Code Search Star & Updated Sorter
// @namespace    https://github.com/micoe
// @version      1.0.0
// @icon         https://github.githubassets.com/favicons/favicon.svg
// @description  Display repository Star count and last update time in GitHub code search results, with sorting, default-order restore, and cross-page scan aggregation.
// @author       micoe
// @match        https://github.com/search*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @connect      github.com
// @connect      api.github.com
// @homepageURL  https://github.com/micoe/github-code-search-sorter
// @updateURL    https://raw.githubusercontent.com/micoe/github-code-search-sorter/refs/heads/main/script.en.user.js
// @downloadURL  https://raw.githubusercontent.com/micoe/github-code-search-sorter/refs/heads/main/script.en.user.js
// ==/UserScript==

(function () {
  'use strict';

  // ========== Token Management ==========
  let GITHUB_TOKEN = GM_getValue('github_token', '');
  const CACHE_PREFIX = 'ghcs_star_updated_';

  function clearRepoCache() {
    try {
      const keys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(CACHE_PREFIX)) keys.push(k);
      }
      keys.forEach((k) => sessionStorage.removeItem(k));
    } catch (e) {}
  }

  GM_registerMenuCommand('⚙️ Set GitHub Token', () => {
    const token = prompt(
      'Enter your GitHub Personal Access Token (public_repo scope only):',
      GITHUB_TOKEN
    );
    if (token !== null) {
      GITHUB_TOKEN = token.trim();
      GM_setValue('github_token', GITHUB_TOKEN);
      clearRepoCache();
      location.reload();
    }
  });

  GM_registerMenuCommand('🗑️ Clear GitHub Token', () => {
    if (confirm('Are you sure you want to clear the saved GitHub Token?')) {
      GITHUB_TOKEN = '';
      GM_setValue('github_token', '');
      clearRepoCache();
      location.reload();
    }
  });

  GM_registerMenuCommand('ℹ️ View Token Status', () => {
    if (GITHUB_TOKEN) {
      alert('Token set: ' + GITHUB_TOKEN.slice(0, 8) + '...\nAPI rate limit: 5000 requests/hour');
    } else {
      alert('No Token set.\nUsing anonymous API with a rate limit of 60 requests/hour. Setting a Token is recommended.');
    }
  });

  GM_registerMenuCommand('📄 Set Scan Pages', () => {
    const cur = GM_getValue('scan_pages', 3);
    const n = prompt('How many pages to scan? (1-20, current ' + cur + ')', cur);
    if (n !== null) {
      const num = parseInt(n, 10);
      if (num >= 1 && num <= 20) {
        GM_setValue('scan_pages', num);
        CONFIG.scanPages = num;
        alert('Set to scan the first ' + num + ' pages');
      } else {
        alert('Please enter an integer between 1 and 20');
      }
    }
  });

  // ========== Configuration ==========
  const CONFIG = {
    cacheTTL: 10 * 60 * 1000,
    batchSize: 5,
    scanPages: Math.max(1, Math.min(20, parseInt(GM_getValue('scan_pages', 3), 10) || 3)),
  };

  // ========== Utility Functions ==========
  const cacheKey = (repo) => `${CACHE_PREFIX}${repo}`;

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

  function formatDate(isoString) {
    if (!isoString) return 'N/A';
    const d = new Date(isoString);
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

  // ========== Create Badge ==========
  function createBadge(info) {
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
    `;
    badge.innerHTML = `
      <span title="Star count">⭐ ${formatStars(info.stars)}</span>
      <span title="Last updated">🕒 ${formatDate(info.updated)}</span>
    `;
    return badge;
  }

  // ========== headerBar Helpers ==========
  function findOwnHeaderBar(el) {
    for (const child of el.children) {
      if (child.tagName === 'DIV' && /headerBar/.test(child.className || '')) {
        return child;
      }
    }
    return null;
  }

  function hasOwnBadge(el) {
    const hb = findOwnHeaderBar(el);
    if (!hb) return false;
    for (const c of hb.children) {
      if (c.classList && c.classList.contains('ghcs-extra-info')) return true;
    }
    return false;
  }

  function readOwnBadge(el) {
    const hb = findOwnHeaderBar(el);
    if (!hb) return null;
    for (const c of hb.children) {
      if (c.classList && c.classList.contains('ghcs-extra-info')) {
        const text = c.textContent;
        let stars = 0, updated = 0;
        const sm = text.match(/⭐\s*([\d.]+k?)/);
        if (sm) {
          let v = sm[1];
          stars = v.endsWith('k') ? parseFloat(v) * 1000 : parseInt(v, 10) || 0;
        }
        const dm = text.match(/🕒\s*([\d-]+)/);
        if (dm) updated = new Date(dm[1]).getTime() || 0;
        return { stars, updated };
      }
    }
    return null;
  }

  // ========== Original Position Tracking ==========
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

  // ========== Batch Fetch & Update UI ==========
  async function annotateResults() {
    const resultItems = document.querySelectorAll('div[class*="codeResultWrapper"]');
    if (resultItems.length === 0) return;

    const repoMap = new Map();

    resultItems.forEach((item) => {
      const repoFullName = extractRepoFullName(item);
      if (!repoFullName) return;
      if (!repoMap.has(repoFullName)) repoMap.set(repoFullName, []);
      repoMap.get(repoFullName).push({ el: item, repoFullName });
    });

    if (repoMap.size === 0) return;

    const repos = Array.from(repoMap.keys());

    for (let i = 0; i < repos.length; i += CONFIG.batchSize) {
      const batch = repos.slice(i, i + CONFIG.batchSize);
      const results = await Promise.all(batch.map((r) => fetchRepoInfo(r)));

      batch.forEach((repo, idx) => {
        const info = results[idx];
        const entries = repoMap.get(repo) || [];
        entries.forEach(({ el }) => {
          if (hasOwnBadge(el)) return;

          const headerBar = findOwnHeaderBar(el);
          if (!headerBar) return;

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

          const badge = createBadge(info);
          headerBar.appendChild(badge);
        });
      });
    }

    ensureOriginalCaptured();
    addSortButtons();
  }

  // ========== In-page Sorting ==========
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
    btnStars.textContent = 'Sort by Stars';
    btnStars.style.cssText = btnStyle;

    const btnUpdated = document.createElement('button');
    btnUpdated.textContent = 'Sort by Update Time';
    btnUpdated.style.cssText = btnStyle;

    const btnReset = document.createElement('button');
    btnReset.textContent = 'Restore Default Order';
    btnReset.style.cssText = btnStyle + 'background-color: var(--bgColor-default, #fff);';

    const btnScan = document.createElement('button');
    btnScan.textContent = '📊 Scan ' + CONFIG.scanPages + ' Pages & Aggregate';
    btnScan.style.cssText = btnStyle + 'background-color: #0969da; color: #fff; border-color: #0969da;';

    btnStars.addEventListener('click', () => toggleSort('stars'));
    btnUpdated.addEventListener('click', () => toggleSort('updated'));
    btnReset.addEventListener('click', () => restoreDefaultOrder());
    btnScan.addEventListener('click', () => scanAllPages());

    bar.appendChild(btnStars);
    bar.appendChild(btnUpdated);
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

    const withKeys = [];
    all.forEach((el) => {
      const key = readOwnBadge(el);
      if (key) withKeys.push({ el, stars: key.stars, updated: key.updated });
    });

    if (withKeys.length === 0) return;

    withKeys.sort((a, b) => {
      let va, vb;
      if (currentSort === 'stars') { va = a.stars; vb = b.stars; }
      else if (currentSort === 'updated') { va = a.updated; vb = b.updated; }
      else return 0;
      return sortAsc ? va - vb : vb - va;
    });

    withKeys.forEach(({ el }) => list.appendChild(el));
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
  }

  // ========== Cross-page Scanning ==========
  let isScanning = false;
  let scanPanelData = [];
  let scanPanelSort = { field: 'stars', asc: false };

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

  // [Change] Return total result items and repo set
  function parseReposFromHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const wrappers = doc.querySelectorAll('div[class*="codeResultWrapper"]');
    const repos = new Set();
    wrappers.forEach((el) => {
      const r = extractRepoFullName(el);
      if (r) repos.add(r);
    });
    return { totalItems: wrappers.length, repos: Array.from(repos) };
  }

  async function scanAllPages() {
    if (isScanning) {
      alert('Scanning in progress, please wait…');
      return;
    }

    const params = new URLSearchParams(location.search);
    const query = params.get('q');
    if (!query) {
      alert('Current page is not a search results page');
      return;
    }

    isScanning = true;

    if (!GITHUB_TOKEN && CONFIG.scanPages > 2) {
      const proceed = confirm(
        'No GitHub Token set. Scanning ' + CONFIG.scanPages + ' pages may trigger the anonymous API rate limit (60 requests/hour).\n' +
        'It is recommended to configure a Token first via the menu command "⚙️ Set GitHub Token".\n\nContinue?'
      );
      if (!proceed) { isScanning = false; return; }
    }

    showScanPanel();

    try {
      const repoToPages = new Map();
      // [Change] Collect per-page statistics
      const pageStats = [];

      for (let p = 1; p <= CONFIG.scanPages; p++) {
        renderScanPanelProgress(
          'Scanning page ' + p + ' / ' + CONFIG.scanPages + '…',
          (p - 1) / CONFIG.scanPages * 50
        );

        const url = new URL(location.href);
        url.searchParams.set('p', String(p));

        try {
          const html = await fetchPageHtml(url.toString());
          const { totalItems, repos } = parseReposFromHtml(html);
          pageStats.push({ page: p, items: totalItems, unique: repos.length });
          repos.forEach((r) => {
            if (!repoToPages.has(r)) repoToPages.set(r, new Set());
            repoToPages.get(r).add(p);
          });
        } catch (e) {
          console.warn('Failed to scan page ' + p + ':', e);
          pageStats.push({ page: p, items: 0, unique: 0, error: true });
        }
      }

      const repoList = Array.from(repoToPages.keys());
      if (repoList.length === 0) {
        renderScanPanelError('No repositories were extracted from the pages. The GitHub page structure may have changed or the search results are empty.');
        isScanning = false;
        return;
      }

      const infos = [];
      for (let i = 0; i < repoList.length; i += CONFIG.batchSize) {
        const batch = repoList.slice(i, i + CONFIG.batchSize);
        const results = await Promise.all(batch.map((r) => fetchRepoInfo(r)));
        batch.forEach((repo, idx) => {
          infos.push({
            repo,
            stars: results[idx].stars,
            updated: results[idx].updated,
            pages: Array.from(repoToPages.get(repo)).sort((a, b) => a - b),
          });
        });
        const progress = 50 + ((i + batch.length) / repoList.length) * 50;
        renderScanPanelProgress(
          'Fetching repo info ' + (i + batch.length) + ' / ' + repoList.length + '…',
          progress
        );
      }

      // [Change] Pass stats along
      renderScanPanelResults(infos, pageStats);
    } catch (e) {
      console.error(e);
      renderScanPanelError('Scan failed: ' + e.message);
    } finally {
      isScanning = false;
    }
  }

  // ========== Scan Panel ==========
  function showScanPanel() {
    let panel = document.getElementById('ghcs-scan-panel');
    if (panel) {
      panel.style.display = 'flex';
      return panel;
    }

    panel = document.createElement('div');
    panel.id = 'ghcs-scan-panel';
    panel.style.cssText = `
      position: fixed;
      top: 60px;
      right: 16px;
      width: 460px;
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
        <span style="font-weight:600;">📊 Scan Results</span>
        <button class="ghcs-sp-close" style="background:transparent;border:none;cursor:pointer;font-size:16px;color:var(--fgColor-muted,#57606a);line-height:1;">✕</button>
      </div>
      <div class="ghcs-sp-stats" style="display:none;padding:6px 12px;font-size:11px;color:var(--fgColor-muted,#57606a);border-bottom:1px solid var(--borderColor-muted,#eaeef2);line-height:1.6;"></div>
      <div class="ghcs-sp-toolbar" style="display:flex;gap:6px;padding:8px 12px;border-bottom:1px solid var(--borderColor-default,#d0d7de);">
        <button class="ghcs-sp-sort-stars" style="cursor:pointer;padding:3px 10px;font-size:12px;border-radius:6px;border:1px solid var(--borderColor-default,#d0d7de);background:var(--bgColor-muted,#f6f8fa);color:inherit;">⭐ Stars</button>
        <button class="ghcs-sp-sort-updated" style="cursor:pointer;padding:3px 10px;font-size:12px;border-radius:6px;border:1px solid var(--borderColor-default,#d0d7de);background:var(--bgColor-muted,#f6f8fa);color:inherit;">🕒 Updated</button>
        <button class="ghcs-sp-rescan" style="cursor:pointer;padding:3px 10px;font-size:12px;border-radius:6px;border:1px solid var(--borderColor-default,#d0d7de);background:var(--bgColor-muted,#f6f8fa);color:inherit;margin-left:auto;">Rescan</button>
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
    });
    panel.querySelector('.ghcs-sp-sort-stars').addEventListener('click', () => {
      if (scanPanelSort.field === 'stars') scanPanelSort.asc = !scanPanelSort.asc;
      else { scanPanelSort.field = 'stars'; scanPanelSort.asc = false; }
      renderScanPanelResults(scanPanelData, panel._stats);
    });
    panel.querySelector('.ghcs-sp-sort-updated').addEventListener('click', () => {
      if (scanPanelSort.field === 'updated') scanPanelSort.asc = !scanPanelSort.asc;
      else { scanPanelSort.field = 'updated'; scanPanelSort.asc = false; }
      renderScanPanelResults(scanPanelData, panel._stats);
    });
    panel.querySelector('.ghcs-sp-rescan').addEventListener('click', () => {
      scanAllPages();
    });

    return panel;
  }

  function renderScanPanelProgress(text, percent) {
    const panel = showScanPanel();
    const prog = panel.querySelector('.ghcs-sp-progress');
    prog.style.display = 'block';
    panel.querySelector('.ghcs-sp-progress-text').textContent = text;
    panel.querySelector('.ghcs-sp-progress-bar').style.width = Math.min(100, percent) + '%';
    const list = panel.querySelector('.ghcs-sp-list');
    if (list.childElementCount > 0) list.innerHTML = '';
    panel.querySelector('.ghcs-sp-stats').style.display = 'none';
  }

  function renderScanPanelError(msg) {
    const panel = showScanPanel();
    panel.querySelector('.ghcs-sp-progress').style.display = 'none';
    panel.querySelector('.ghcs-sp-list').innerHTML =
      '<div style="padding:16px;color:var(--fgColor-danger,#cf222e);">' + msg + '</div>';
  }

  // [Change] Accept stats parameter and display statistics
  function renderScanPanelResults(infos, stats) {
    scanPanelData = infos;
    const panel = showScanPanel();
    panel._stats = stats; // cache for reuse when sorting
    panel.querySelector('.ghcs-sp-progress').style.display = 'none';

    // ---- Display statistics ----
    const statsEl = panel.querySelector('.ghcs-sp-stats');
    if (stats && stats.length > 0) {
      const totalItems = stats.reduce((s, x) => s + (x.items || 0), 0);
      const perPage = stats.map((x) =>
        'P.' + x.page + ':' + (x.error ? '✕' : x.items + ' items/' + x.unique + ' repos')
      ).join('  ·  ');
      statsEl.innerHTML =
        '<div>Scanned <b>' + stats.length + '</b> pages · <b>' + totalItems +
        '</b> result items · <b>' + infos.length + '</b> unique repositories after dedup</div>' +
        '<div style="opacity:0.8;margin-top:2px;">' + perPage + '</div>';
      statsEl.style.display = 'block';
    } else {
      statsEl.style.display = 'none';
    }

    // ---- Render list ----
    const list = panel.querySelector('.ghcs-sp-list');
    list.innerHTML = '';

    const sorted = [...infos].sort((a, b) => {
      let va, vb;
      if (scanPanelSort.field === 'stars') { va = a.stars || 0; vb = b.stars || 0; }
      else {
        va = a.updated ? new Date(a.updated).getTime() : 0;
        vb = b.updated ? new Date(b.updated).getTime() : 0;
      }
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
      row.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <span style="font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${info.repo}</span>
          <span style="font-size:11px;color:var(--fgColor-muted,#57606a);flex-shrink:0;">${pagesText}</span>
        </div>
        <div style="display:flex;gap:12px;font-size:12px;color:var(--fgColor-muted,#57606a);">
          <span>⭐ ${formatStars(info.stars)}</span>
          <span>🕒 ${formatDate(info.updated)}</span>
        </div>
      `;
      row.addEventListener('click', () => {
        const targetPage = info.pages[0];
        const url = new URL(location.href);
        if (targetPage === 1) url.searchParams.delete('p');
        else url.searchParams.set('p', String(targetPage));
        location.href = url.toString();
      });
      row.addEventListener('mouseenter', () => { row.style.background = 'var(--bgColor-muted,#f6f8fa)'; });
      row.addEventListener('mouseleave', () => { row.style.background = ''; });
      list.appendChild(row);
    });

    panel.querySelector('.ghcs-sp-header span').textContent =
      '📊 Scan Results (' + infos.length + ' repos)';
  }

  // ========== Observe Page Changes ==========
  let observer = null;
  let debounceTimer = null;

  function startObserve() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        annotateResults();
        if (currentSort) applySort();
      }, 800);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ========== Initialization ==========
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
