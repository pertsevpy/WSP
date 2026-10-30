// ==UserScript==
// @name         WSP_more_events
// @namespace    https://github.com/pertsevpy/WSP/
// @version      1.0.0
// @description  Кнопка "Больше событий" в карточке объекта WSP (запрос журнала за 14 дней)
// @author       Pavel P.
// @license      Unlicense
// @updateURL    https://raw.githubusercontent.com/pertsevpy/WSP/main/WSP_more_events.user.js
// @downloadURL  https://raw.githubusercontent.com/pertsevpy/WSP/main/WSP_more_events.user.js
// @match        *://127.0.0.1/*
// @match        *://localhost/*
// @match        *://192.168.1.100/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        eventsDaysRange:   14,
        serverUrl:         window.location.origin,
        buttonId:          'btnMoreEvents',
        modalId:           'modalEvents',
        disableAfterClick: 5000
    };

    // ─────────────────────────────────────────────────────────────
    // Утилиты
    // ─────────────────────────────────────────────────────────────
    function formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}${m}${d}`;
    }

    // ─────────────────────────────────────────────────────────────
    // Номер текущего объекта из открытой карточки
    // ─────────────────────────────────────────────────────────────
    function getCurrentObjectNumber() {
        const modal = document.getElementById('modaleStatusObj');
        if (!modal) return null;
        // Ищем любой h5, чей текст содержит «Объект № N»
        for (const h5 of modal.querySelectorAll('h5')) {
            const m = h5.textContent.match(/Объект\s*№\s*(\d+)/);
            if (m) return m[1];
        }
        return null;
    }

    // ─────────────────────────────────────────────────────────────
    // Кнопка «Больше событий»
    // ─────────────────────────────────────────────────────────────
    function ensureButton() {
        const checkboxLabel = document.querySelector(
            '#info-object-controlled-tabs-pane-infoObjectEvents .filter-checkbox'
        );
        if (!checkboxLabel) return;

        const existing = document.getElementById(CONFIG.buttonId);
        // Кнопка уже на своём месте — выходим
        if (existing && existing.parentNode === checkboxLabel.parentNode) return;

        // Кнопка есть, но React пересоздал родителя — убираем старую
        if (existing) existing.remove();

        const btn = document.createElement('button');
        btn.id = CONFIG.buttonId;
        btn.type = 'button';                 // важно: не submit
        btn.className = 'btn btn-default';
        btn.textContent = 'Больше событий';
        btn.style.cssText = 'margin: 0 10px 10px 10px;';
        btn.addEventListener('click', onMoreEventsClick);

        checkboxLabel.insertAdjacentElement('afterend', btn);
    }

    function onMoreEventsClick(e) {
        const btn = e.currentTarget;
        const objNum = getCurrentObjectNumber();
        if (!objNum) {
            alert('Не удалось определить номер объекта. Откройте карточку объекта заново.');
            return;
        }
        btn.disabled = true;
        showModalWithEvents(objNum).finally(() => {
            setTimeout(() => { btn.disabled = false; }, CONFIG.disableAfterClick);
        });
    }

    // ─────────────────────────────────────────────────────────────
    // Своя модалка #modalEvents (живёт в <body>, не в React-дереве)
    // ─────────────────────────────────────────────────────────────
    function ensureModal() {
        if (document.getElementById(CONFIG.modalId)) return;

        const modal = document.createElement('div');
        modal.id = CONFIG.modalId;
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 10000; display: none;
        `;

        const content = document.createElement('div');
        content.className = 'modal-content';
        content.style.cssText = `
            background: #fefefe; margin: 5% auto; padding: 20px;
            border: 1px solid #888; width: 85%; max-height: 80vh; overflow-y: auto;
            border-radius: 6px;
        `;

        content.innerHTML = `
            <span id="eventsModalClose"
                  style="color:#aaa; float:right; font-size:28px; font-weight:bold; cursor:pointer;">&times;</span>
            <h3 id="eventsModalTitle" style="margin-top:0;">События объекта</h3>
            <div id="eventsLoading" style="display:none; text-align:center; padding:20px;">
                <div style="margin-bottom:10px;">Загрузка данных...</div>
                <div class="spinner"></div>
            </div>
            <div id="eventsContainer" style="max-height:60vh; overflow-y:auto;">
                <table id="moreDataTable" class="events-table">
                    <thead></thead>
                    <tbody></tbody>
                </table>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        document.getElementById('eventsModalClose').addEventListener('click', hideModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) hideModal(); });

        addModalStyles();
    }

    function addModalStyles() {
        if (document.getElementById('eventsModalStyles')) return;
        const style = document.createElement('style');
        style.id = 'eventsModalStyles';
        style.textContent = `
            @keyframes spin { 0% { transform: rotate(0); } 100% { transform: rotate(360deg); } }
            .spinner {
                border: 4px solid rgba(0,0,0,.1);
                border-top-color: #3498db;
                border-radius: 50%;
                width: 30px; height: 30px;
                animation: spin 1s linear infinite;
                margin: 0 auto;
            }
            .events-table { width: 100%; border-collapse: collapse; }
            .events-table th, .events-table td {
                border: 1px solid #ddd; padding: 8px; text-align: left;
                font-size: 14px;
            }
            .events-table th { background: #f2f2f2; position: sticky; top: 0; }
            .events-table tr:nth-child(even) { background: #f9f9f9; }
        `;
        document.head.appendChild(style);
    }

    function showModal() {
        const m = document.getElementById(CONFIG.modalId);
        if (m) {
            document.body.style.overflow = 'hidden';
            m.style.display = 'block';
        }
    }
    function hideModal() {
        const m = document.getElementById(CONFIG.modalId);
        if (m) {
            document.body.style.overflow = '';
            m.style.display = 'none';
        }
    }

    async function showModalWithEvents(objNum) {
        showModal();
        const title     = document.getElementById('eventsModalTitle');
        const loader    = document.getElementById('eventsLoading');
        const container = document.getElementById('eventsContainer');
        if (title) title.textContent = `События объекта № ${objNum}`;
        if (loader) loader.style.display = 'block';
        if (container) container.style.display = 'none';

        try {
            await loadAndDisplayEvents(objNum);
        } catch (err) {
            console.error('[Events] error:', err);
            if (container) {
                container.innerHTML =
                    `<div style="padding:20px;color:#a94442;">Ошибка загрузки: ${err.message}</div>`;
            }
        } finally {
            if (loader) loader.style.display = 'none';
            if (container) container.style.display = '';
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Загрузка и отрисовка
    // ─────────────────────────────────────────────────────────────
    async function loadAndDisplayEvents(objNum) {
        const now  = new Date();
        const past = new Date();
        past.setDate(now.getDate() - CONFIG.eventsDaysRange);

        const url = `${CONFIG.serverUrl}/api/journal_events/` +
                    `${formatDate(past)}-0-${formatDate(now)}-86340`;

        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
        const data = await resp.json();
        displayEvents(data, objNum);
    }

    function displayEvents(events, objNum) {
        const table = document.getElementById('moreDataTable');
        if (!table) return;
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');
        thead.innerHTML = '';
        tbody.innerHTML = '';

        const filtered = (events || [])
            .filter(e => String(e.num_obj) === String(objNum))
            .filter(e => !/тест/i.test(e.text_event || ''));

        const cols = [
            { key: 'num_channel', label: 'Канал' },
            { key: 'time_sys',    label: 'Дата и время' },
            { key: 'num_obj',     label: 'Объект' },
            { key: 'name_obj',    label: 'Название' },
            { key: 'text_event',  label: 'Событие' },
            { key: 'address_obj', label: 'Адрес' }
        ];

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${cols.length}" style="text-align:center;">` +
                              `Нет событий для отображения</td></tr>`;
            // всё равно показываем шапку, чтобы оператор видел, какие колонки ожидались
            const hr = document.createElement('tr');
            cols.forEach(c => {
                const th = document.createElement('th');
                th.textContent = c.label;
                hr.appendChild(th);
            });
            thead.appendChild(hr);
            return;
        }

        const headerRow = document.createElement('tr');
        cols.forEach(c => {
            const th = document.createElement('th');
            th.textContent = c.label;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        filtered.forEach(ev => {
            const tr = document.createElement('tr');
            cols.forEach(c => {
                const td = document.createElement('td');
                td.textContent = ev[c.key] != null ? String(ev[c.key]) : '';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    }

    // ─────────────────────────────────────────────────────────────
    // Поддержание актуальности (React-перерисовки)
    // ─────────────────────────────────────────────────────────────
    function tick() {
        ensureButton();
        ensureModal();
    }

    function boot() {
        tick();
        new MutationObserver(tick)
            .observe(document.documentElement, { childList: true, subtree: true });
        setInterval(tick, 1000);
        console.log('[Events] more-events script ready');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();