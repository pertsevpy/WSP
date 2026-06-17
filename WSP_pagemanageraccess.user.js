// ==UserScript==
// @name         WSP_page_manager_access
// @namespace    https://github.com/pertsevpy/WSP/
// @version      0.1
// @description  Syncing a list of objects for multiple users
// @author       Pavel P.
// @license      Unlicense
// @updateURL    https://raw.githubusercontent.com/pertsevpy/WSP/main/WSP_pagemanageraccess.user.js
// @downloadURL  https://raw.githubusercontent.com/pertsevpy/WSP/main/WSP_pagemanageraccess.user.js
// @match        *://192.168.1.100:8000/pagemanageraccess
// @match        *://localhost:8000/pagemanageraccess
// @icon         https://www.google.com/s2/favicons?sz=64&domain=1.100
// @grant        GM.xmlHttpRequest
// @connect      192.168.1.100
// ==/UserScript==

(function() {
    'use strict';

    const usernames = ['user1', 'user2', 'user3', 'user4', 'user5'];
    const BASE_URL = 'http://192.168.1.100:8000';
    const BUTTON_ID = 'sync-users-button';

    // HTTP-запрос через GM_xmlhttpRequest
    function makeRequest(method, url, data = null) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: method,
                url: url,
                headers: { 'Content-Type': 'application/json' },
                data: data ? JSON.stringify(data) : null,
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        try {
                            resolve(JSON.parse(response.responseText));
                        } catch (e) {
                            resolve(response.responseText);
                        }
                    } else {
                        reject(new Error(`Ошибка ${response.status}: ${response.statusText}`));
                    }
                },
                onerror: () => reject(new Error('Ошибка сети или CORS')),
                ontimeout: () => reject(new Error('Таймаут запроса')),
                timeout: 10000
            });
        });
    }

    // Основная функция синхронизации
    async function syncUsers(event) {
        const button = event.target;
        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = 'Синхронизация...';

        try {
            const objects = await makeRequest('GET', `${BASE_URL}/api/objectsuser/1`);
            if (!Array.isArray(objects)) throw new Error('Полученные данные не являются массивом');

            const results = await Promise.allSettled(
                usernames.map(username => makeRequest('PUT', `${BASE_URL}/api/objects/`, {
                    user: username,
                    listNumobj: objects
                }))
            );

            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            if (failed === 0) {
                alert(`Синхронизация завершена успешно для всех ${successful} пользователей`);
            } else {
                alert(`Синхронизация завершена с ошибками:\nУспешно: ${successful}\nОшибок: ${failed}\nПодробности в консоли`);
                results.forEach((r, idx) => {
                    if (r.status === 'rejected') console.error(`Ошибка для ${usernames[idx]}:`, r.reason);
                });
            }
        } catch (error) {
            console.error('Ошибка синхронизации:', error);
            alert(`Ошибка синхронизации: ${error.message}`);
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    }

    // Создание кнопки
    function createButton() {
        const button = document.createElement('button');
        button.id = BUTTON_ID;
        button.textContent = 'Синхронизировать пользователей с первым';
        Object.assign(button.style, {
            margin: '10px',
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
        });
        button.addEventListener('click', syncUsers);
        return button;
    }

    // Добавляет кнопку в первый найденный div.col-lg-12 (если ещё не добавлена)
    function addButtonToFirstContainer() {
        // Если кнопка уже существует где-то, не добавляем повторно
        if (document.getElementById(BUTTON_ID)) return true;

        const root = document.querySelector('#content_admin.react_contentAdmin');
        if (!root) return false;

        const firstDiv = root.querySelector('div.col-lg-12');
        if (!firstDiv) return false;

        const button = createButton();
        firstDiv.appendChild(button);
        return true;
    }

    // Наблюдатель за появлением первого col-lg-12 или контейнера
    function observeFirstContainer() {
        // Если кнопка уже есть, не запускаем наблюдателя
        if (document.getElementById(BUTTON_ID)) return;

        const root = document.querySelector('#content_admin.react_contentAdmin');
        if (!root) {
            // Если корня ещё нет, ждём его появления
            const bodyObserver = new MutationObserver(() => {
                const newRoot = document.querySelector('#content_admin.react_contentAdmin');
                if (newRoot) {
                    bodyObserver.disconnect();
                    observeFirstContainer(); // перезапускаем с корнем
                }
            });
            bodyObserver.observe(document.body, { childList: true, subtree: true });
            return;
        }

        // Если первый div уже есть - добавляем
        if (root.querySelector('div.col-lg-12')) {
            addButtonToFirstContainer();
            return;
        }

        // Иначе следим за появлением div.col-lg-12 внутри корня
        const observer = new MutationObserver(() => {
            if (addButtonToFirstContainer()) {
                observer.disconnect(); // кнопка добавлена, больше не нужно
            }
        });
        observer.observe(root, { childList: true, subtree: true });
    }

    // Инициализация
    function init() {
        observeFirstContainer();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
