// ==UserScript==
// @name         WSP_sync_object_names
// @namespace    https://github.com/pertsevpy/WSP/
// @version      1.0.0
// @description  Синхронизация наименований объектов: nameobj из managerobject в full_name через /api/general/ (с прогресс-баром). Проверено на V37.0.0.25
// @author       Pavel P.
// @license      Unlicense
// @updateURL    https://raw.githubusercontent.com/pertsevpy/WSP/main/WSP_sync_object_names.user.js
// @downloadURL  https://raw.githubusercontent.com/pertsevpy/WSP/main/WSP_sync_object_names.user.js
// @match        *://192.168.1.100/*
// @match        *://127.0.0.1/*
// @match        *://localhost/*
// @grant        GM_xmlhttpRequest
// @connect      192.168.1.100
// @connect      127.0.0.1
// @connect      localhost
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const BASE_URL   = location.origin;
    const BUTTON_ID  = 'sync-object-names-button';
    const PANEL_ID   = 'sync-object-names-panel';
    const NUMOBJ_MIN = 10;
    const NUMOBJ_MAX = 1000;

    let cancelRequested = false;
    let lastReport      = '';

    // ─── HTTP ───────────────────────────────────────────────────
    function makeRequest(method, url, data = null) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method, url,
                headers: { 'Content-Type': 'application/json' },
                data: data ? JSON.stringify(data) : null,
                timeout: 15000,
                onload: r => {
                    if (r.status >= 200 && r.status < 300) {
                        try { resolve(JSON.parse(r.responseText)); }
                        catch { resolve(r.responseText); }
                    } else {
                        reject(new Error(`HTTP ${r.status}: ${r.statusText}`));
                    }
                },
                onerror:   () => reject(new Error('Сетевая ошибка или CORS')),
                ontimeout: () => reject(new Error('Таймаут запроса'))
            });
        });
    }

    // ─── UI helpers ─────────────────────────────────────────────
    function getEls() {
        const panel = document.getElementById(PANEL_ID);
        if (!panel) return null;
        return {
            panel,
            fill:      panel.querySelector('.sync-progress-fill'),
            counter:   panel.querySelector('.sync-progress-text'),
            log:       panel.querySelector('.sync-log'),
            btnCancel: panel.querySelector('.sync-cancel'),
            btnCopy:   panel.querySelector('.sync-copy'),
            btnSync:   document.getElementById(BUTTON_ID)
        };
    }

    function panelReset(total) {
        const els = getEls(); if (!els) return;
        els.panel.style.display = 'block';
        els.log.innerHTML = '';
        els.fill.style.width = '0%';
        els.counter.textContent = `0 / ${total}`;
        els.btnCopy.style.display = 'none';
        els.btnCancel.style.display = 'inline-block';
        els.btnCancel.disabled = false;
        els.btnCancel.textContent = 'Отмена';
        cancelRequested = false;
    }

    function panelProgress(done, total) {
        const els = getEls(); if (!els) return;
        els.fill.style.width = (total ? done / total * 100 : 0).toFixed(1) + '%';
        els.counter.textContent = `${done} / ${total}`;
    }

    function panelLog(msg, cls) {
        const els = getEls(); if (!els) return;
        const line = document.createElement('div');
        line.className = 'sync-log-line' + (cls ? ' sync-log-' + cls : '');
        line.textContent = msg;
        els.log.appendChild(line);
        els.log.scrollTop = els.log.scrollHeight;
    }

    function panelDone(summaryText) {
        const els = getEls(); if (!els) return;
        els.btnCancel.style.display = 'none';
        els.btnCopy.style.display = 'inline-block';
        lastReport = summaryText || els.log.innerText;
    }

    // ─── Логика синхронизации ───────────────────────────────────
    async function syncObjectNames() {
        const els = getEls(); if (!els) return;
        const btn = els.btnSync;
        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = 'Синхронизация...';

        const logLines = [];
        let ok = 0, unchanged = 0, fail = 0, total = 0;

        try {
            const managers = await makeRequest('GET', `${BASE_URL}/api/managerobject/`);
            if (!Array.isArray(managers)) throw new Error('managerobject: не массив');

            const namesByNum = new Map();
            for (const m of managers) {
                if (m && m.numobj != null && m.nameobj != null) {
                    namesByNum.set(String(m.numobj), String(m.nameobj));
                }
            }

            const targets = [...namesByNum.keys()]
                .filter(n => /^\d+$/.test(n))
                .map(Number)
                .filter(v => v >= NUMOBJ_MIN && v <= NUMOBJ_MAX)
                .sort((a, b) => a - b)
                .map(v => String(v));

            total = targets.length;
            if (total === 0) {
                panelReset(0);
                panelLog(`Не найдены объекты в диапазоне ${NUMOBJ_MIN}–${NUMOBJ_MAX}`, 'err');
                panelDone('');
                return;
            }

            panelReset(total);
            console.log(`[SYNC] диапазон ${NUMOBJ_MIN}–${NUMOBJ_MAX}, найдено ${total}:`, targets);

            let done = 0;
            for (const numobj of targets) {
                if (cancelRequested) {
                    panelLog('— прогон прерван пользователем —', 'err');
                    logLines.push('— прогон прерван пользователем');
                    break;
                }

                const nameobj = namesByNum.get(numobj);
                try {
                    const general = await makeRequest('GET', `${BASE_URL}/api/general/${numobj}`);
                    if (!general || typeof general !== 'object') throw new Error('general: пустой ответ');

                    const before = general.full_name || '';
                    const changed = before !== nameobj;

                    const body = { ...general };
                    delete body.name_form;
                    body.full_name = nameobj;
                    if (typeof body.code_intercom === 'string' && /^-?\d+$/.test(body.code_intercom)) {
                        body.code_intercom = Number(body.code_intercom);
                    }

                    await makeRequest('PUT', `${BASE_URL}/api/general/`, body);

                    if (changed) {
                        ok++;
                        panelLog(`✓ ${numobj}: "${before}" → "${nameobj}"`, 'ok');
                        logLines.push(`✓ ${numobj}: "${before}" → "${nameobj}"`);
                    } else {
                        unchanged++;
                        panelLog(`= ${numobj}: без изменений ("${nameobj}")`, 'noop');
                        logLines.push(`= ${numobj}: без изменений ("${nameobj}")`);
                    }
                } catch (e) {
                    fail++;
                    panelLog(`✗ ${numobj}: ${e.message}`, 'err');
                    logLines.push(`✗ ${numobj}: ${e.message}`);
                    console.error(`[SYNC] ${numobj}:`, e);
                }

                done++;
                panelProgress(done, total);

                if (done < total) await new Promise(r => setTimeout(r, 50));
            }

            const summary =
                `Диапазон: ${NUMOBJ_MIN}–${NUMOBJ_MAX}\n` +
                `Всего объектов: ${total}\n` +
                `Изменено: ${ok}\nБез изменений: ${unchanged}\nОшибок: ${fail}\n` +
                (cancelRequested ? '\n⚠ Прогон прерван пользователем\n' : '') +
                '\n' + logLines.join('\n');

            panelLog('', null);
            panelLog(`Итог: изменено ${ok}, без изменений ${unchanged}, ошибок ${fail}`,
                     fail > 0 ? 'err' : 'ok');
            panelDone(summary);
            console.log('[SYNC] Итог:\n' + summary);

        } catch (e) {
            console.error('[SYNC] Ошибка:', e);
            panelReset(0);
            panelLog(`Критическая ошибка: ${e.message}`, 'err');
            panelDone(`Ошибка: ${e.message}`);
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    // ─── Копирование отчёта ─────────────────────────────────────
    async function copyReport() {
        const els = getEls(); if (!els) return;
        const text = lastReport || els.log.innerText;
        const restore = () => {
            setTimeout(() => { els.btnCopy.textContent = 'Скопировать отчёт'; }, 1500);
        };
        try {
            await navigator.clipboard.writeText(text);
            els.btnCopy.textContent = '✓ Скопировано';
            restore();
        } catch (_) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch (_) {}
            document.body.removeChild(ta);
            els.btnCopy.textContent = '✓ Скопировано';
            restore();
        }
    }

    // ─── Панель прогресса ───────────────────────────────────────
    function buildPanel() {
        const panel = document.createElement('div');
        panel.id = PANEL_ID;
        Object.assign(panel.style, {
            display: 'none',
            margin: '10px 0 15px 15px',
            padding: '12px',
            background: '#f7f7f9',
            border: '1px solid #ddd',
            borderRadius: '6px',
            maxWidth: '860px',
            fontSize: '13px',
            fontFamily: 'Arial, sans-serif'
        });

        panel.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                <div style="flex:1; height:18px; background:#e6e6e6; border-radius:4px; overflow:hidden;">
                    <div class="sync-progress-fill"
                         style="height:100%; width:0%; background:#28a745; transition:width .15s ease;"></div>
                </div>
                <span class="sync-progress-text"
                      style="min-width:80px; text-align:right; font-weight:bold;">0 / 0</span>
            </div>
            <div class="sync-log"
                 style="max-height:280px; overflow-y:auto; background:#fff; border:1px solid #e0e0e0;
                        border-radius:4px; padding:6px 8px; margin-bottom:10px;
                        font-family:Consolas, monospace; font-size:12px; line-height:1.45;"></div>
            <div style="display:flex; gap:10px;">
                <button class="sync-cancel" type="button"
                        style="display:none; padding:6px 14px; background:#dc3545; color:#fff;
                               border:none; border-radius:4px; cursor:pointer;">Отмена</button>
                <button class="sync-copy" type="button"
                        style="display:none; padding:6px 14px; background:#007bff; color:#fff;
                               border:none; border-radius:4px; cursor:pointer;">Скопировать отчёт</button>
            </div>
        `;

        if (!document.getElementById(PANEL_ID + '-style')) {
            const style = document.createElement('style');
            style.id = PANEL_ID + '-style';
            style.textContent = `
                #${PANEL_ID} .sync-log-ok   { color: #1a7f1a; }
                #${PANEL_ID} .sync-log-noop { color: #666; }
                #${PANEL_ID} .sync-log-err  { color: #b00020; }
            `;
            document.head.appendChild(style);
        }

        panel.querySelector('.sync-cancel').addEventListener('click', () => {
            cancelRequested = true;
            const els = getEls();
            if (els) { els.btnCancel.disabled = true; els.btnCancel.textContent = 'Отмена...'; }
        });
        panel.querySelector('.sync-copy').addEventListener('click', copyReport);

        return panel;
    }

    // ─── Кнопка ─────────────────────────────────────────────────
    function createButton() {
        const btn = document.createElement('button');
        btn.id = BUTTON_ID;
        btn.type = 'button';
        btn.textContent = `Синхронизировать наименования (${NUMOBJ_MIN}–${NUMOBJ_MAX})`;
        Object.assign(btn.style, {
            margin: '10px 0 10px 15px',
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            verticalAlign: 'middle'
        });
        btn.addEventListener('click', syncObjectNames);
        return btn;
    }

    function ensureButton() {
        const onPage = location.hash.indexOf('pagemanagerobject') !== -1;
        const hasBtn   = !!document.getElementById(BUTTON_ID);
        const hasPanel = !!document.getElementById(PANEL_ID);

        if (!onPage) {
            if (hasBtn)   document.getElementById(BUTTON_ID).remove();
            if (hasPanel) document.getElementById(PANEL_ID).remove();
            return;
        }
        if (hasBtn && hasPanel) return;

        const root = document.querySelector('#content_admin.react_contentAdmin');
        if (!root) return;

        let h4 = null;
        for (const h of root.querySelectorAll('h4')) {
            if (/менеджер\s+объектов/i.test(h.textContent)) { h4 = h; break; }
        }
        const container = h4 ? h4.closest('div.col-lg-12') : root.querySelector('div.col-lg-12');
        if (!container) return;

        if (!hasBtn)   container.appendChild(createButton());
        if (!hasPanel) container.appendChild(buildPanel());
    }

    // ─── Инициализация ──────────────────────────────────────────
    ensureButton();
    window.addEventListener('hashchange', ensureButton);
    new MutationObserver(ensureButton).observe(document.documentElement, { childList: true, subtree: true });
    setInterval(ensureButton, 1000);
})();