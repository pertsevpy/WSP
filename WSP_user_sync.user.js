// ==UserScript==
// @name         WSP_user_sync
// @namespace    https://github.com/pertsevpy/WSP/
// @version      2.2.0
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
    const usernames   = ['user1', 'user2', 'user3', 'user4', 'user5'];
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

    // Запрос текущего списка объектов пользователя
    async function getObjects(username) {
        const data = await makeRequest('GET', `${BASE_URL}/api/objectsuser/${encodeURIComponent(username)}`);
        if (!Array.isArray(data)) throw new Error(`Для пользователя ${username} получены данные не в виде массива`);
        return data.map(String);
    }

    // Отправка списка объектов (PUT переключает состояние каждого объекта для пользователя)
    async function putObjects(username, listNumobj) {
        return makeRequest('PUT', `${BASE_URL}/api/objects/`, {
            user: username,
            listNumobj
        });
    }

    // «Очистка»: запрашиваем текущий список и отправляем его же обратно,
    // чтобы сбросить/переключить состояние каждого объекта для пользователя.
    async function clearUserState(username) {
        const current = await getObjects(username);
        if (current.length === 0) {
            return { username, cleared: 0, note: 'список пуст' };
        }
        await putObjects(username, current);
        return { username, cleared: current.length };
    }

    async function syncUsers(event) {
        const btn = event.target;
        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = 'Синхронизация...';

        const log = [];
        try {
            // 1) Эталонный список объектов первого пользователя
            const objects = await getObjects(FIRST_USER);
            log.push(`Эталон (${FIRST_USER}): ${objects.length} объектов`);
            if (objects.length === 0) {
                throw new Error(`У пользователя ${FIRST_USER} нет объектов для синхронизации`);
            }

            // 2) Очистка состояния у каждого пользователя из usernames
            btn.textContent = 'Очистка...';
            const clearResults = await Promise.allSettled(
                usernames.map(u => clearUserState(u))
            );
            clearResults.forEach((r, i) => {
                if (r.status === 'fulfilled') {
                    log.push(`Очистка ${usernames[i]}: OK (${r.value.cleared} об.)`);
                } else {
                    log.push(`Очистка ${usernames[i]}: ОШИБКА — ${r.reason.message}`);
                    console.error(`Ошибка очистки для ${usernames[i]}:`, r.reason);
                }
            });

            // 3) Синхронизация с первым пользователем
            btn.textContent = 'Синхронизация...';
            const syncResults = await Promise.allSettled(
                usernames.map(u => putObjects(u, objects))
            );
            const ok   = syncResults.filter(r => r.status === 'fulfilled').length;
            const fail = syncResults.filter(r => r.status === 'rejected').length;
            syncResults.forEach((r, i) => {
                if (r.status === 'rejected') {
                    console.error(`Ошибка синхронизации для ${usernames[i]}:`, r.reason);
                }
            });

            console.group('Синхронизация пользователей');
            log.forEach(l => console.log(l));
            console.groupEnd();

            if (fail === 0) {
                alert(
                    `Синхронизация завершена успешно для всех ${ok} пользователей.\n` +
                    `Эталон: ${objects.length} объектов.`
                );
            } else {
                alert(
                    `Синхронизация завершена с ошибками:\n` +
                    `Успешно: ${ok}\nОшибок: ${fail}\nПодробности в консоли`
                );
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