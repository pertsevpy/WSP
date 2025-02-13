// ==UserScript==
// @name         WSP_menu_main_page_TETS
// @namespace    https://github.com/pertsevpy/WSP/
// @version      0.1.3
// @description  Additional functions for the main menu
// @author       Pavel P.
// @license      Unlicense
// @updateURL    https://raw.githubusercontent.com/pertsevpy/WSP/main/WSP_menu_main_page.user.js
// @downloadURL  https://raw.githubusercontent.com/pertsevpy/WSP/main/WSP_menu_main_page.user.js
// @match        *://127.0.0.1:8000/
// @match        *://127.0.0.1:8000/success
// @match        *://localhost:8000/
// @match        *://localhost:8000/success
// @match        *://192.168.1.100:8000/
// @match        *://192.168.1.100:8000/success
// @icon         https://www.google.com/s2/favicons?sz=64&domain=1.100
// @grant        GM.xmlHttpRequest
// ==/UserScript==

/*
   If you found it, but did not receive a link,
   you do not need this code.

   Small improvements for the WSP software we are forced to use.

   You must be logged in as an administrator to be able to work with the API.
   TODO: Do not display the report generation button for other users.

   The script allows you to generate an engineering report from the WSP admin panel

   Unlicense
   ...
   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
   EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
   MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
   IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
   OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
   ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
   OTHER DEALINGS IN THE SOFTWARE.
   ...
   For more information, please refer to <http://unlicense.org/>
*/

const SERVER_URL = window.location.origin;

(function () {
    'use strict';

    const panelBody = document.querySelector('.panel-body');
    const fetchDiv = document.createElement('div');
    fetchDiv.className = 'col-md-10 col-md-offset-1 div_button_home';
    panelBody.insertBefore(fetchDiv, panelBody.firstChild);

    // Adding a button to a main page
    const fetchButton = document.createElement('button');
    fetchButton.className = 'btn btn-success btn-lg col-md-12 center-block';
    fetchButton.style.width = '100%';
    fetchButton.textContent = 'Список объектов';
    fetchDiv.insertBefore(fetchButton, fetchDiv.firstChild);

    // Button click handler
    fetchButton.addEventListener('click', () => {
        fetchData(`${SERVER_URL}/api/users/`)
            .then(usersData => {
            const select = document.createElement('select');
            select.id = 'user-select';

            usersData.forEach(user => {
                const option = document.createElement('option');
                option.value = user.login;
                option.textContent = user.login;
                select.appendChild(option);
            });

            const modalContent = document.createElement('div');
            modalContent.appendChild(document.createElement('p')).textContent = 'Выберите пользователя:';
            modalContent.appendChild(select);

            const confirmButton = document.createElement('button');
            confirmButton.id = 'confirm-button';
            confirmButton.textContent = 'Подтвердить';
            modalContent.appendChild(confirmButton);

            const modal = document.createElement('div');
            //modal.className = 'modal fade in';
            modal.style.position = 'fixed';
            modal.style.top = '50%';
            modal.style.left = '50%';
            modal.style.transform = 'translate(-50%, -50%)';
            modal.style.backgroundColor = 'white';
            modal.style.padding = '20px';
            modal.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
            modal.appendChild(modalContent);
            document.body.appendChild(modal);

            confirmButton.addEventListener('click', () => {
                const userSelect = document.getElementById('user-select');
                const selectedUsername = userSelect.value;

                if (!selectedUsername) {
                    alert('Пожалуйста, выберите пользователя.');
                    return;
                }
                document.body.removeChild(modal); // Delete the modal window with the user's choice for the report

                // Getting data from API
                fetchData(`${SERVER_URL}/api/managerobject/`)
                    .then(objectData => {
                    const tableData = [];
                    const promises = [];

                    //Getting user data
                    const userObjectSetPromise = fetchData(`${SERVER_URL}/api/objectsuser/${selectedUsername}`)
                    .then(generalData => new Set(generalData));

                    // Create a table
                    objectData.forEach(obj => {
                        if (obj.numobj) {
                            // We receive the owner's data and general data
                            const ownerPromise = fetchData(`${SERVER_URL}/api/owner/${obj.numobj}`)
                            .then(ownerData => ({
                                numobj: obj.numobj,
                                nameobj: obj.nameobj,
                                fio: ownerData.fio || '',
                                mobile_phone: ownerData.mobile_phone || '',
                                mobile_phone2: ownerData.mobile_phone2 || ''
                            }));

                            const generalPromise = fetchData(`${SERVER_URL}/api/general/${obj.numobj}`)
                            .then(generalData => ({
                                town_name: generalData.town_name || '',
                                region_name: generalData.region_name || '',
                                street_name: generalData.street_name || '',
                                number_building: generalData.number_building || ''
                            }));

                            // Combining data
                            promises.push(Promise.all([ownerPromise, generalPromise]).then(([ownerData, generalData]) => {
                                return userObjectSetPromise.then(userObjectSet => ({
                                    ...ownerData,
                                    address: `${generalData.town_name}, ${generalData.region_name}, ${generalData.street_name}, ${generalData.number_building}`,
                                    user: userObjectSet.has(obj.numobj.toString()) ? '1' : ''
                                }));
                            }));
                        }
                    });

                    // Waiting for all requests to complete
                    return Promise.all(promises).then(results => {
                        tableData.push(...results);
                        tableData.sort((a, b) => a.numobj - b.numobj);
                        showModal(tableData);
                    });
                })
                    .catch(error => {
                    console.error('Error while receiving data:', error);
                });

            });
        })
            .catch(error => {
            console.error('Error when getting the list of users:', error);
        });
    });


    // Function to execute the request
    function fetchData(url) {
        return new Promise((resolve, reject) => {
            GM.xmlHttpRequest({
                method: 'GET',
                url: url,
                onload: (response) => {
                    if (response.status >= 200 && response.status < 300) {
                        try {
                            resolve(JSON.parse(response.responseText));
                        } catch (e) {
                            reject('Error parsing JSON: ' + e);
                        }
                    } else {
                        reject('Loading error: ' + response.statusText);
                    }
                },
                onerror: (error) => {
                    reject('Request error: ' + error);
                }
            });
        });
    }

    // Function to create and display a modal window
    function showModal(data) {
        const modal = document.createElement('div');
        modal.className = 'modal fade in';
        modal.style.display = 'block';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.zIndex = '1000';

        const modalContent = document.createElement('div');
        modalContent.style.backgroundColor = 'white';
        modalContent.style.borderRadius = '5px';
        modalContent.style.padding = '20px';
        modalContent.style.margin = '100px auto';
        modalContent.style.width = '80%';
        modalContent.style.maxHeight = '80%';
        modalContent.style.overflowY = 'auto';


        modalContent.innerHTML += `<h5>Данные объектов</h5>`;
        modalContent.innerHTML += `<table class='table'><thead>
            <tr>
                <th>N объекта</th>
                <th>Наименование</th>
                <th>ФИО собственника</th>
                <th>Телефон 1</th>
                <th>Телефон 2</th>
                <th>Адрес</th>
                <th>Закреплен</th>
            </tr>
        </thead><tbody>
            ${data.map(item => `
                <tr>
                    <td>${item.numobj}</td>
                    <td>${item.nameobj}</td>
                    <td>${item.fio}</td>
                    <td>${item.mobile_phone}</td>
                    <td>${item.mobile_phone2}</td>
                    <td>${item.address}</td>
                    <td>${item.user}</td>
                </tr>`).join('')}
        </tbody></table>`;

        // Function to create a close button
        function createCloseButton(modal) {
            const closeButton = document.createElement('button');
            closeButton.textContent = 'Закрыть';
            closeButton.style.float = 'right';
            closeButton.setAttribute('data-dismiss', 'modal');
            closeButton.setAttribute('aria-hidden', 'true');

            closeButton.addEventListener('click', () => {
                modal.setAttribute('aria-hidden', 'true');
                modal.classList.remove('in');
                modal.style.display = 'none';
                document.body.removeChild(modal);
            });

            return closeButton;
        }

        // The function of closing
        const closeModal = () => {
            document.body.removeChild(modal);
            document.removeEventListener('keydown', handleKeyDown);
        };

        // The ESC key handler
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        const closeButtonTop = createCloseButton(modal);
        const closeButton = createCloseButton(modal);
        modalContent.insertBefore(closeButtonTop, modalContent.firstChild);
        modalContent.appendChild(closeButton);

        modal.appendChild(modalContent);
        document.body.appendChild(modal);
    }
})();