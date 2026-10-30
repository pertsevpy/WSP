// ==UserScript==
// @name         WSP_pageoperator_ui
// @namespace    https://github.com/pertsevpy/WSP/
// @version      2.0.0
// @description  UI-улучшения оператора WSP: шрифт, плитки, аккордеон, клик по ленте, tooltip, индикация связи, запоминание вкладки, одноразовое включение скрывающих галочек. Проверено на V37.0.0.25
// @author       Pavel P.
// @license      Unlicense
// @updateURL    https://raw.githubusercontent.com/pertsevpy/WSP/main/WSP_pageoperator_ui.user.js
// @downloadURL  https://raw.githubusercontent.com/pertsevpy/WSP/main/WSP_pageoperator_ui.user.js
// @match        *://192.168.1.100/*
// @match        *://127.0.0.1/*
// @match        *://localhost/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const FONT_SIZE       = '16px';
    const INPUT_FONT_SIZE = '15px';
    const ROOT_SELECTOR   = '#journal_event_list';
    const TILE_MIN_WIDTH  = '50px';

    const css = `
        ${ROOT_SELECTOR} table th,
        ${ROOT_SELECTOR} table td { font-size: ${FONT_SIZE} !important; }
        ${ROOT_SELECTOR} .form-control {
            font-size: ${INPUT_FONT_SIZE} !important;
            height: auto !important; min-height: 28px;
        }
        .box--pageoperator:has(input[name="objectNameFilter"]:checked) .ProductGrid {
            grid-template-columns: repeat(auto-fill, minmax(${TILE_MIN_WIDTH}, 1fr)) !important;
            column-gap: 0 !important; row-gap: 0 !important;
        }
        .box--pageoperator:has(input[name="objectNameFilter"]:checked) .ProductGridColumn > .ProductTile {
            width: auto !important; max-width: none !important;
            flex: initial !important; min-width: 0 !important;
            box-sizing: border-box;
        }
        ${ROOT_SELECTOR} tbody tr:not(:has(td.react-bs-table-no-data)) { cursor: pointer; }
        ${ROOT_SELECTOR} tbody tr:not(:has(td.react-bs-table-no-data)):hover {
            outline: 2px solid rgba(0, 123, 255, 0.35); outline-offset: -2px;
        }
        #status_object .ProductTile[title] { cursor: help; }
        #journal_events_list_fire:has(#modalAlarm[style*="display: block"]),
        #journal_events_list_fire:has(#modalAlarm.in),
        #journal_events_list_fire:has(#modaleHandlingObj[style*="display: block"]),
        #journal_events_list_form_alarm_fail:has(#modalFailHandling[style*="display: block"]) {
            display: block !important; height: auto !important; overflow: visible !important;
        }
        .inner { transition: background-color 0.3s ease; }
        body.wsp-conn-lost .inner { background-color: #ffa3a3 !important; }
    `;

    function tryInject() {
        if (document.getElementById('events-feed-font')) return true;
        const head = document.head || document.getElementsByTagName('head')[0];
        if (!head) return false;
        const style = document.createElement('style');
        style.id = 'events-feed-font';
        style.textContent = css;
        head.appendChild(style);
        console.log('[OPERATOR-CSS] injected');
        return true;
    }

    // ─── Аккордеон «Объекты в тревоге» ───────────────────────────
    function ensureAlarmCollapse() {
        const header = document.querySelector('header#alarmTable');
        if (!header) return;
        const h5 = header.querySelector('h5');
        if (h5 && !h5.hasAttribute('data-toggle')) {
            h5.setAttribute('href', '#journal_events_list_fire');
            h5.setAttribute('data-toggle', 'collapse');
            h5.style.cursor = 'pointer';
        }
        if (!header.querySelector('.toolbar')) {
            const toolbar = document.createElement('div');
            toolbar.className = 'toolbar';
            const ul = document.createElement('ul');
            ul.className = 'nav pull-right';
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#journal_events_list_fire';
            a.setAttribute('data-toggle', 'collapse');
            a.className = 'accordion-toggle minimize-box';
            a.innerHTML = '<i class="icon-chevron-up"></i>';
            li.appendChild(a); ul.appendChild(li); toolbar.appendChild(ul);
            header.appendChild(toolbar);
        }
    }

    // ─── Tooltip на плитках ───────────────────────────────────────
    const NAME_CACHE   = new Map();
    let namesLoadedAt  = 0;
    let namesLoading   = false;
    const NAMES_TTL    = 5 * 60 * 1000;
    const TITLES_DELAY = 1500;
    let titlesPrimed   = false;

    async function loadObjectNamesFromApi() {
        if (namesLoading) return;
        if (Date.now() - namesLoadedAt < NAMES_TTL) return;
        namesLoading = true;
        try {
            const resp = await fetch(`${location.origin}/api/managerobject/`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            const items = Array.isArray(data) ? data : Object.values(data);
            let added = 0;
            for (const info of items) {
                if (!info || typeof info !== 'object') continue;
                const num  = info.object_addr != null ? String(info.object_addr) : '';
                const name = info.nameobj      != null ? String(info.nameobj)     : '';
                if (!num || !name) continue;
                if (NAME_CACHE.get(num) !== name) { NAME_CACHE.set(num, name); added++; }
            }
            namesLoadedAt = Date.now();
            console.log('[NAMES] loaded', NAME_CACHE.size, 'objects (+', added, 'changes)');
        } catch (e) {
            console.warn('[NAMES] load failed:', e);
        } finally {
            namesLoading = false;
        }
    }

    function ensureTileTitles() {
        for (const tile of document.querySelectorAll('#status_object .ProductTile')) {
            const numEl = tile.querySelector('.ProductName label.h5 b');
            const num   = numEl ? numEl.textContent.trim() : '';
            let name = '';
            const nameEl = tile.querySelector('.ProductName label.h6');
            if (nameEl) name = nameEl.textContent.trim();
            else if (num && NAME_CACHE.has(num)) name = NAME_CACHE.get(num);
            if (!name) continue;
            if (tile.getAttribute('title') !== name) tile.setAttribute('title', name);
        }
    }

    // ─── Клик по строке «Ленты событий» → карточка ──────────────
    function findProductTile(objNum) {
        for (const tile of document.querySelectorAll('#status_object .ProductTile')) {
            const label = tile.querySelector('.ProductName label.h5 b');
            if (label && label.textContent.trim() === objNum) return tile;
        }
        return null;
    }
    function expandStatusObjectIfCollapsed() {
        const panel = document.getElementById('status_object');
        if (!panel || panel.classList.contains('in')) return;
        const box = panel.closest('.box--pageoperator');
        const toggle = box && box.querySelector('.accordion-toggle.minimize-box');
        if (toggle) toggle.click();
    }
    function doOpenTile(tile) {
        try { tile.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
        tile.click();
    }
    function openObjectByNumber(num) {
        let tile = findProductTile(num);
        if (tile) { doOpenTile(tile); return; }
        expandStatusObjectIfCollapsed();
        setTimeout(() => {
            tile = findProductTile(num);
            if (tile) doOpenTile(tile);
            else console.warn('[EVENTS-CLICK] ProductTile не найден для объекта №', num);
        }, 300);
    }
    document.addEventListener('click', (e) => {
        if (e.target.closest('button, a, input, select, textarea')) return;
        const row = e.target.closest('#journal_event_list tbody tr');
        if (!row) return;
        if (row.querySelector('.react-bs-table-no-data')) return;
        const numCell = row.querySelector('.tableColumnNumObj');
        if (!numCell) return;
        const num = numCell.textContent.trim();
        if (!num) return;
        console.log('[EVENTS-CLICK] row → object', num);
        openObjectByNumber(num);
    });

    // ─── Индикация потери связи ──────────────────────────────────
    const CONN = { changeTitle: true, fireEvent: true };
    let connInitialized = false, connLastDown = false, connSavedTitle = null;
    function updateConnectionStatus() {
        const serverLabel = Array.from(
            document.querySelectorAll('#top .box.dark header h5 .label')
        ).find(l => /связь\s+с\s+сервером/i.test(l.textContent));
        if (!serverLabel) return;
        const isDown = !serverLabel.classList.contains('label-success');
        if (connInitialized && isDown === connLastDown) return;
        connInitialized = true; connLastDown = isDown;
        document.body.classList.toggle('wsp-conn-lost', isDown);
        if (CONN.changeTitle) {
            if (isDown) {
                if (connSavedTitle === null) connSavedTitle = document.title;
                document.title = '🔴 Нет связи — WSP';
            } else if (connSavedTitle !== null) {
                document.title = connSavedTitle; connSavedTitle = null;
            }
        }
        if (isDown) console.warn('[WSP] Связь с сервером ПОТЕРЯНА');
        else        console.log ('[WSP] Связь с сервером восстановлена');
        if (CONN.fireEvent) {
            window.dispatchEvent(new CustomEvent('wsp:connection-changed', { detail: { down: isDown } }));
        }
    }

    // ─── Запоминание вкладки ─────────────────────────────────────
    const LAST_TAB_KEY  = 'wsp.cardLastTab';
    const TAB_ID_PREFIX = 'info-object-controlled-tabs-tab-';
    let cardWasOpen = false, lastTabRestored = false, modalObserverReady = false;
    function getActiveCardTabId() {
        const a = document.querySelector('#info-object-controlled-tabs li.active > a[role="tab"]');
        return a ? a.id : null;
    }
    function getSavedCardTabId() { try { return localStorage.getItem(LAST_TAB_KEY); } catch (_) { return null; } }
    function saveCardTabId(id) {
        try { if (id && id.startsWith(TAB_ID_PREFIX)) localStorage.setItem(LAST_TAB_KEY, id); } catch (_) {}
    }
    function clickCardTab(id) {
        const link = document.getElementById(id);
        if (!link) return false;
        const savedHash = location.hash;
        link.click();
        if (location.hash !== savedHash) history.replaceState(null, '', savedHash || '#');
        return true;
    }
    function handleCardTabs() {
        const modal = document.getElementById('modaleStatusObj');
        const isOpen = !!modal && modal.style.display !== 'none';
        if (!isOpen) { if (cardWasOpen) { cardWasOpen = false; lastTabRestored = false; } return; }
        if (!cardWasOpen) { cardWasOpen = true; lastTabRestored = false; }
        if (lastTabRestored) return;
        if (!document.getElementById('info-object-controlled-tabs')) return;
        const saved = getSavedCardTabId();
        if (!saved) { lastTabRestored = true; return; }
        if (!document.getElementById(saved)) {
            try { localStorage.removeItem(LAST_TAB_KEY); } catch (_) {}
            lastTabRestored = true; return;
        }
        const current = getActiveCardTabId();
        if (saved === current) { lastTabRestored = true; return; }
        if (clickCardTab(saved)) { lastTabRestored = true; console.log('[TAB] restored:', saved.replace(TAB_ID_PREFIX, '')); }
    }
    document.addEventListener('click', (e) => {
        const tab = e.target.closest('#info-object-controlled-tabs a[role="tab"]');
        if (tab && tab.id) { saveCardTabId(tab.id); lastTabRestored = true; }
    });
    function watchModalAttributes() {
        if (modalObserverReady) return;
        const modal = document.getElementById('modaleStatusObj');
        if (!modal) return;
        new MutationObserver(() => handleCardTabs()).observe(modal, {
            attributes: true, attributeFilter: ['style', 'class']
        });
        modalObserverReady = true;
        console.log('[TAB] modal observer attached');
    }

    // ─── Авто-включение галочек: один раз на DOM-узел ───────────
    const CHECKED_ONCE = new WeakSet();
    function autoCheckOnce(name) {
        for (const cb of document.querySelectorAll(`input[name="${name}"]`)) {
            if (CHECKED_ONCE.has(cb)) continue;
            CHECKED_ONCE.add(cb);
            if (!cb.checked) cb.click();
        }
    }

    // ─── Запуск ─────────────────────────────────────────────────
    function tickAll() {
        ensureAlarmCollapse();
        updateConnectionStatus();
        handleCardTabs();
        watchModalAttributes();
        autoCheckOnce('objectNameFilter');
        autoCheckOnce('testMessageFilter');
        loadObjectNamesFromApi();
        if (titlesPrimed) ensureTileTitles();
    }

    function boot() {
        tickAll();
        new MutationObserver(tickAll)
            .observe(document.documentElement, { childList: true, subtree: true });
        setInterval(tickAll, 1000);
        setTimeout(() => {
            titlesPrimed = true;
            ensureTileTitles();
            setTimeout(ensureTileTitles, 800);
        }, TITLES_DELAY);
    }

    const startStyle = () => { if (!tryInject()) setTimeout(startStyle, 50); };
    if (document.readyState === 'loading') {
        startStyle();
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        startStyle();
        boot();
    }
})();