// ==UserScript==
// @name         WSP_menu_main_page
// @namespace    https://github.com/pertsevpy/WSP/
// @version      0.1.1
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

(function () {
    'use strict';

    // Adding a button to a page
    const buttonContainer = document.querySelector('.col-md-10.col-md-offset-1.div_button_home');
    const fetchButton = document.createElement('button');
    fetchButton.className = 'btn btn-info btn-lg col-md-12 center-block';
    fetchButton.textContent = 'Список объектов';
    buttonContainer.insertBefore(fetchButton, buttonContainer.firstChild);

fetchButton.addEventListener('click', () => {
    const SERVER_URL = window.location.host;
    // Getting data from the first API
    fetchData('http://'+SERVER_URL+'/api/managerobject/')
        .then(objectData => {
            const tableData = [];
            let promises = [];

            // Creating a table
            objectData.forEach(obj => {
                if (obj.numobj) {
                    // Creating a promise for fetching owner data
                    const ownerPromise = fetchData(`http://`+SERVER_URL+`/api/owner/${obj.numobj}`).then(ownerData => {
                        return {
                            numobj: obj.numobj,
                            nameobj: obj.nameobj,
                            fio: ownerData.fio || '',
                            mobile_phone: ownerData.mobile_phone || '',
                            mobile_phone2: ownerData.mobile_phone2 || ''
                        };
                    });

                    // Creating a promise for fetching general data
                    const generalPromise = fetchData(`http://`+SERVER_URL+`/api/general/${obj.numobj}`).then(generalData => {
                        return {
                            town_name: generalData.town_name || '',
                            region_name: generalData.region_name || '',
                            street_name: generalData.street_name || '',
                            number_building: generalData.number_building || ''
                        };
                    });

                    // Combining both promises to create the final object
                    promises.push(Promise.all([ownerPromise, generalPromise]).then(([ownerData, generalData]) => {
                        // Create the full entry with address
                        const fullData = {
                            ...ownerData,
                            address: `${generalData.town_name}, ${generalData.region_name}, ${generalData.street_name}, ${generalData.number_building}`
                        };
                        tableData.push(fullData);
                    }));
                }
            });

            // We are waiting for all promises to complete
            return Promise.all(promises).then(() => {
                // Sort by numobj
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
                            const jsonData = JSON.parse(response.responseText);
                            resolve(jsonData);
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
        modal.className = 'modal fade in'; // WPS
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

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Закрыть';
        closeButton.style.float = 'right';

        closeButton.addEventListener('click', () => {
            console.log('Close modal');
            modal.classList.remove('in'); 
            modal.style.display = 'none';
            document.body.removeChild(modal);
        });

        modalContent.appendChild(closeButton);
        modalContent.innerHTML += `<h5>Данные объектов</h5>`;
        modalContent.innerHTML += `<table class='table'><thead>
            <tr>
                <th>N объекта</th>
                <th>Наименование</th>
                <th>ФИО</th>
                <th>Телефон 1</th>
                <th>Телефон 2</th>
                <th>Адрес</th>
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
                </tr>`).join('')}
        </tbody></table>`;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);
    }

})();
