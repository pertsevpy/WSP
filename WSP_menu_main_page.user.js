// ==UserScript==
// @name         WSP_menu_main_page
// @namespace    https://github.com/pertsevpy/WSP/
// @version      0.1.2
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

const USERNAME = '1'; // the name of the user for which to check the pinning of objects
// TODO make user selection (drop down list)

(function () {
    'use strict';

    // Adding a button to a page
    const buttonContainer = document.querySelector('.col-md-10.col-md-offset-1.div_button_home');
    const fetchButton = document.createElement('button');
    fetchButton.className = 'btn btn-info btn-lg col-md-12 center-block';
    fetchButton.textContent = 'Список объектов';
    buttonContainer.insertBefore(fetchButton, buttonContainer.firstChild);

    // Button click handler
    fetchButton.addEventListener('click', () => {
        const SERVER_URL = window.location.host;

        // Getting data from API
        fetchData(`http://${SERVER_URL}/api/managerobject/`)
            .then(objectData => {
            const tableData = [];
            const promises = [];

            //Getting user data
            const userObjectSetPromise = fetchData(`http://${SERVER_URL}/api/objectsuser/${USERNAME}`)
            .then(generalData => new Set(generalData));

            // Create a table
            objectData.forEach(obj => {
                if (obj.numobj) {
                    // We receive the owner's data and general data
                    const ownerPromise = fetchData(`http://${SERVER_URL}/api/owner/${obj.numobj}`)
                    .then(ownerData => ({
                        numobj: obj.numobj,
                        nameobj: obj.nameobj,
                        fio: ownerData.fio || '',
                        mobile_phone: ownerData.mobile_phone || '',
                        mobile_phone2: ownerData.mobile_phone2 || ''
                    }));

                    const generalPromise = fetchData(`http://${SERVER_URL}/api/general/${obj.numobj}`)
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

    // Function to create a close button
    function createCloseButton(modal) {
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Закрыть';
        closeButton.style.float = 'right';
        closeButton.classList.add('close');
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
                <th>ФИО</th>
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

        const closeButton = createCloseButton(modal);
        modalContent.insertBefore(closeButton, modalContent.firstChild);
        // modalContent.appendChild(closeButton);

        modal.appendChild(modalContent);
        document.body.appendChild(modal);
    }
})();