// ==UserScript==
// @name         WSP_user_sync
// @namespace    https://github.com/pertsevpy/WSP/
// @version      2.0.0
// @description  Добавляет кнопку синхронизации в первый div.col-lg-12 на странице "Менеджер доступа". обновленная версия WSP_pagemanageraccess.user.js для V37.*
// @author       Pavel P.
// @license      Unlicense
// @updateURL    https://raw.githubusercontent.com/pertsevpy/WSP/main/WSP_user_sync.user.js
// @downloadURL  https://raw.githubusercontent.com/pertsevpy/WSP/main/WSP_user_sync.user.js
// @match        *://127.0.0.1/*
// @match        *://localhost/*
// @match        *://192.168.1.100/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const FIRST_USER  = '1';
    const usernames   = ['voroninanm', 'yakuncevaeg', 'lykovanm', 'chekanovavn', 'pazhitnovaov'];
    const BASE_URL    = 'http://192.168.1.100:8000';
    const BUTTON_ID   = 'sync-users-button';

    function makeRequest(method, url, data = null) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method, url,
                headers: { 'Content-Type': 'application/json' },
                data: data ? JSON.stringify(data) : null,
                timeout: 10000,
                onload: r => {
                    if (r.status >= 200 && r.status < 300) {
                        try { resolve(JSON.parse(r.responseText)); }
                        catch { resolve(r.responseText); }
                    } else {
                        reject(new Error(`Ошибка ${r.status}: ${r.statusText}`));
                    }
                },
                onerror:   () => reject(new Error('Ошибка сети или CORS')),
                ontimeout: () => reject(new Error('Таймаут запроса'))
            });
        });
    }

    async function syncUsers(event) {
        const btn = event.target;
        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = 'Синхронизация...';
        try {
            const objects = await makeRequest('GET', `${BASE_URL}/api/objectsuser/${FIRST_USER}`);
            if (!Array.isArray(objects)) throw new Error('Полученные данные не являются массивом');

            const results = await Promise.allSettled(usernames.map(u =>
                makeRequest('PUT', `${BASE_URL}/api/objects/`, { user: u, listNumobj: objects })
            ));
            const ok   = results.filter(r => r.status === 'fulfilled').length;
            const fail = results.filter(r => r.status === 'rejected').length;

            if (fail === 0) alert(`Синхронизация завершена успешно для всех ${ok} пользователей`);
            else {
                alert(`Синхронизация завершена с ошибками:\nУспешно: ${ok}\nОшибок: ${fail}\nПодробности в консоли`);
                results.forEach((r, i) => { if (r.status === 'rejected') console.error(`Ошибка для ${usernames[i]}:`, r.reason); });
            }
        } catch (e) {
            console.error('Ошибка синхронизации:', e);
            alert(`Ошибка синхронизации: ${e.message}`);
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    function createButton() {
        const b = document.createElement('button');
        b.id = BUTTON_ID;
        b.textContent = 'Синхронизировать пользователей с первым';
        Object.assign(b.style, {
            margin: '10px', padding: '8px 16px',
            backgroundColor: '#007bff', color: '#fff',
            border: 'none', borderRadius: '4px',
            cursor: 'pointer', fontSize: '14px'
        });
        b.addEventListener('click', syncUsers);
        return b;
    }

    function ensureButton() {
        const onPage = location.hash.indexOf('pagemanageraccess') !== -1;
        const existing = document.getElementById(BUTTON_ID);

        if (!onPage) { if (existing) existing.remove(); return; }
        if (existing) return;

        const root = document.querySelector('#content_admin.react_contentAdmin');
        if (!root) return;
        const firstDiv = root.querySelector('div.col-lg-12');
        if (!firstDiv) return;

        firstDiv.appendChild(createButton());
    }

    ensureButton();
    window.addEventListener('hashchange', ensureButton);
    new MutationObserver(ensureButton).observe(document.documentElement, { childList: true, subtree: true });
    setInterval(ensureButton, 1000);
})();