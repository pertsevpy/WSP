// ==UserScript==
// @name         WSP_pageoperator
// @namespace    https://github.com/pertsevpy/WSP/
// @version      0.3.1
// @description  Improving the usability of the WSP interface operator's page
// @author       Pavel P.
// @license      Unlicense
// @updateURL    https://raw.githubusercontent.com/pertsevpy/WSP/main/WSP_pageoperator.user.js
// @downloadURL  https://raw.githubusercontent.com/pertsevpy/WSP/main/WSP_pageoperator.user.js
// @match        *://127.0.0.1:8000/pageoperator
// @match        *://localhost:8000/pageoperator
// @match        *://192.168.1.10:8000/pageoperator
// @icon         https://www.google.com/s2/favicons?sz=64&domain=1.100
// @grant        none
// ==/UserScript==

/*
   If you found it, but did not receive a link,
   you do not need this code.

   Small improvements for the WSP software we are forced to use
   Robert_Downey_Jr_rolling_eyes_Meme.jpg

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

const IS_RIGHT_CLICK_ON = false;
const SERVER_URL = '127.0.0.1:8000';

console.log('Proton script start');

function fd(date) {
    // format Date to YYYYMMDD
    return ['year', 'month', 'day'].map(e => new Intl.DateTimeFormat('en', {
        [e]: 'numeric',
    }).format(date).padStart(2, '0')).join``;
}

function mainPageMod() {
    // hide test events - touch to two checkbox
    const touch = document.getElementsByName('testMessageFilter');
    touch.forEach(button => {
        button.click();
    });

    // further we will need id and names
    addInfoToTile();

    // add filter button
    const targetText = 'Все объекты';
    const h5Elements = document.getElementsByTagName('h5');

    const input = document.createElement('input');
    for (let i = 0; i < h5Elements.length; i++) {
        const h5Element = h5Elements[i];

        if (h5Element.textContent === targetText) {
            input.setAttribute('class','form-control');
            h5Element.parentNode.insertBefore(input, h5Element.nextSibling);
            input.style.width = '200pt';
            input.style.display = 'inline';
            input.id = 'filterInput';
            break;
        }
    }

    var header = document.querySelector('header');
    input.type = 'text';
    input.placeholder = 'Фильтр по названию';

    // add filter
    let timeoutId;

    input.addEventListener('keyup', function() {
        clearTimeout(timeoutId);
        var filterValue = this.value.toLowerCase();
        var products = document.getElementsByClassName('ProductTile');

        for (let i=0; i<products.length; i++) {

            if (products[i].firstElementChild.getAttribute('title') === null || products[i].firstElementChild.getAttribute('title') == '') {
                products[i].firstElementChild.setAttribute('title', 'Noname');
            }
            // obj title + obj num
            const title = products[i].firstElementChild.getAttribute('title').toLowerCase() + ' ' + products[i].id.toString();

            if (title.includes(filterValue)) {
                products[i].style.display = 'block';
            } else {
                products[i].style.display = 'none';
            }
        }
        // auto clear filter
        timeoutId = setTimeout(function() {
            input.value = '';
            const event = new Event('keyup');
            input.dispatchEvent(event);
        }, 60000);
    })
}

function addObjNamesToTile() {
    const url = 'http://'+SERVER_URL+'/api/managerobject/';

    fetch(url)
        .then(response => response.json())
        .then(function(data) {
            for (var key in data) {
                if (data.hasOwnProperty(key)) {
                    if (typeof data[key] === 'object') {
                        let obInfo = data[key];
                        let obTile = document.
                            getElementById(String(obInfo.object_addr))
                        if (obTile !== null) {
                            obTile.childNodes[0].title = String(obInfo.nameobj);
                        }
                    } else {
                        console.error(key + ': ' + data[key]);
                    }
                }
            }
        })
        .catch(error => console.error(error));
}

function addInfoToTile() {
    // required for normal navigation in other func
    // if it breaks again, move it to document.onclick
    const interval = setInterval(() => {
        if (document.getElementsByClassName('ProductTile')) {
            clearInterval(interval);
            let spans = document.getElementsByClassName('ProductTile');
            if (spans.length == 0) {
                setTimeout(function() {
                    ;
                }, 2000);
            }
            // add id to Tiles
            for (let i=0; i<spans.length; i++) {
                spans[i].id = String(spans[i].textContent);
            }
            addObjNamesToTile(); // after assigning an id
        }
    }, 500);
}

function addAdressToCard() {
    // adding an address to the header of an object card
    let ob_info_v2 = document.getElementById('information'); // for v23-26
    let ob_info_v3 = document.getElementsByClassName('row row-margin'); // for v30
	let ob_info_addr
    if (ob_info_v2 !== null) {
    	// if server version v23-26
    	ob_info_addr = ob_info_v2.getElementsByClassName('col-md-8');
	} else if (ob_info_v3 !== null) {
	    // if server version v30
	    ob_info_addr = ob_info_v3[4].getElementsByClassName('col-md-8');
	} else {
		console.warn('Failed to add address to card');
		return null;
	}

    let addr = ob_info_addr[0].textContent;
    if (addr.trim() == ',') addr = '_ NO ADRESS _';
    document.getElementById('headAdress').innerHTML = addr;
}

function editObjCardInfoEvents() {
    // Add to the obj card the ability to get information from the report manager
    let labelObjEvents = document.getElementsByClassName("filter-checkbox");
    let btnMoreEvents = document.createElement('button');
    btnMoreEvents.id = "btnMoreEvents";
    btnMoreEvents.className = "btn btn-default";
    btnMoreEvents.innerHTML = "Больше событий";
    btnMoreEvents.style.marginLeft = '10px';
    btnMoreEvents.style.marginRight = '10px';

    btnMoreEvents.onclick = function () {
        // Get the object number of the current open card
        let objNum = document.getElementsByClassName('col-lg-12 col-md-12 col-sm-12 col-xs-12 col-md-offset-4')[0].
        getElementsByTagName('h5')[0].innerHTML.split('№ ').pop();
        modal.style.display = "block";
        modal.className = 'modal fade in';
        drawTable(objNum);
        disableButton(btnMoreEvents);
    };

    labelObjEvents[0].insertAdjacentElement('afterend', btnMoreEvents);
    // Create a div that will contain all the content of the modal window
    let modal = document.createElement('div')
    let modalDialog = document.createElement('div')
    let modalContent = document.createElement('div');
    let modalHeader = document.createElement('div');
    let modalBody = document.createElement('div');
    let modalBottom = document.createElement('div');
    // Add the title and contents of the modal window inside this div
    modalBody.innerHTML = `
    <h3>События, принятые от объекта</h3>
    <table id="moreData-table" class="table table-bordered"></table>
    `;
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalBody.appendChild(modalBottom);
    modalDialog.appendChild(modalContent);
    modal.appendChild(modalDialog);
    // Create a button to close the modal window:
    // Create a button element
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add('close');
    button.setAttribute('data-dismiss', 'modal');
    button.setAttribute('aria-hidden', 'true');
    button.innerHTML = '×';
    // Add a button to the selected element
    modalHeader.appendChild(button);

    button.addEventListener('click', () => {
        // Close the modal window
        modal.classList.remove('in');
        modal.style.display = 'none';
        let table = document.getElementById("moreData-table");
        let rowCount = table.rows.length;
        for (let i = rowCount - 1; i >= 0; i--) {
            table.deleteRow(i);
        }
    })

    const button2 = document.createElement('button');
    button2.type = 'button';
    button2.classList.add('btn');
    button2.classList.add('btn-default');
    button2.setAttribute('data-dismiss', 'modal');
    button2.innerHTML = 'Закрыть';

    modalBottom.appendChild(button2);

    button2.addEventListener('click', () => {
        // Close the modal window
        modal.classList.remove('in');
        modal.style.display = 'none';

        let table = document.getElementById("moreData-table");
        let rowCount = table.rows.length;

        for (let i = rowCount - 1; i >= 0; i--) {
            table.deleteRow(i);
        }
    })

    // style body
    modal.className = 'modal fade in';
    modal.id = 'modalEvents'
    modalDialog.className = 'modal-dialog modal-dialog-object';
    modalDialog.style.width = "85%";
    modalContent.className = 'modal-content';
    modalHeader.classList.add('modal-header');
    modalBody.classList.add('modal-body');
    modalBottom.classList.add('row');

    // Add a modal window to the page
    document.body.appendChild(modal);
}


function disableButton(obj) {
    obj.disabled = true;
    setTimeout(() => enableButton(obj), 60 * 1000)
}


function enableButton(obj) {
    obj.disabled = false;
}


function drawTable(objNum) {
    // Get data from the report manager. Draw and fill out a table with events
    var now = new Date();
    var now2 = new Date();
    now2.setDate(now.getDate()-14);

    const urlJournalEvents = `http://${SERVER_URL}/api/journal_events/${fd(now2)}-0-${fd(now)}-86340`;

    fetch(urlJournalEvents)
        .then(response => response.json())
        .then(function(data) {

        // Filter by object number. Hide test events
        data = data.filter((obj) => obj.text_event.indexOf('Тест') === -1)
        data = data.filter((obj) => obj.num_obj == objNum)
        // Remove unnecessary columns
        data.forEach(obj => {
            delete obj.id_journal_events;
            delete obj.code_mess;
            delete obj.operator_name;
            delete obj.address_obj;
        });
        // Creating table
        let table = document.getElementById("moreData-table");
        // Creating table headers
        const headers = Object.keys(data[0]);
        const headerRow = document.createElement('tr');
        headers.forEach(headerText => {
            const header = document.createElement('th');
            header.style.textAlign = "center";
            const textNode = document.createTextNode(headerText);
            header.appendChild(textNode);
            headerRow.appendChild(header);
        });
        table.appendChild(headerRow);
        // Filling the table with data from an array of objects
        data.forEach(obj => {
            const row = document.createElement('tr');
            row.classList.add('hite-block-bg');
            row.classList.add('table-bordered');
            headers.forEach(header => {
                const cell = document.createElement('td');
                const textNode = document.createTextNode(obj[header]);
                cell.appendChild(textNode);
                row.appendChild(cell);
            });
            table.appendChild(row);
        });
    })
        .catch(error => error ? console.error : console.log); //  If there is something to output

}



function drawingAttention() {
    // аttracting attention in case of problems
    if (document.getElementsByClassName('label label-danger').length > 0) {
        // there are problems with the equipment
        console.log('CONNECT LOST');
        document.getElementsByClassName('inner')[0]
            .style.backgroundColor = '#ffa3a3';
        document.getElementById('wrap').style.backgroundColor = '#ffa3a3';
    } else {
        document.getElementsByClassName('inner')[0]
            .style.backgroundColor = '#f8f8f8';
        document.getElementById('wrap').style.backgroundColor = '#f8f8f8';
    }
}

function permanentUpdate() {
    addAdressToCard(); // refresh the current address in the modal
    drawingAttention();
}

function editObjCard() {
    // removing the alignment in the header of the card, which spoils everything
    // or for class 'col-lg-12 col-md-12 col-sm-12 col-xs-12 col-md-offset-4'
    // del 'col-md-offset-4'
    let headingElement = document.querySelector('.col-md-offset-4');
    headingElement.style.marginLeft = '10pt';

    // increasing the information content of the object card
    let h5addr = document.createElement('h5');
    h5addr.id = 'headAdress';
    h5addr.innerHTML = '';
    document.getElementsByClassName(
        'col-lg-12 col-md-12 col-sm-12 col-xs-12 col-md-offset-4')[0]
        .append(h5addr);

    // fix the width of the popup window
    let modal_widow = document.getElementsByClassName('modal-content min-width-1200')
    if(modal_widow.length != 0) {
        modal_widow[0].style.minWidth='120%' // the window does not fit into the screen when zooming
    }
    addAdressToCard(); // set the current address
}

// ##################################################################
// events
// ##################################################################

if (window.location.href.includes('pageoperator')) {
        window.onbeforeunload = function () {
        return 'Do you really want to close?';
    }
}

document.body.oncontextmenu = function (e) {
    // disable the right-click context menu
    if (!IS_RIGHT_CLICK_ON) {
        if (window.location.href.includes('pageoperator')) {
            console.log('right click block: ');
            //console.log(e);
            return false;
        }
    }
};

document.onclick = function(e) {
    //console.log('click on:');
    //console.log(e);
    // open the object card when you click in the event feed
    if (e.target.classList.contains('tableColumnNumChannel') ||
        e.target.classList.contains('tableColumnTimeSys') ||
        e.target.classList.contains('tableColumnNumObj') ||
        e.target.classList.contains('tableColumnNameObj') ||
        e.target.classList.contains('tableColumnTextEvent')) {
            let ob_num = (e.target.closest('tr')
                          .getElementsByClassName('tableColumnNumObj')[0]
                          .textContent);
            if (Object.entries(ob_num).length != 0) {
                let elems = document.getElementById(ob_num);
                if (elems != null) {
                    elems.click();
                } else {
                    console.log(`Card ${ob_num} is not attached or does not exist`);
                }
            }
    }
    addAdressToCard();
};

window.addEventListener('load', editObjCard(), false);
window.addEventListener('load', mainPageMod(), false);
window.addEventListener('load', editObjCardInfoEvents(), false);
setInterval(() => permanentUpdate(), 500);
