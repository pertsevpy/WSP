// ==UserScript==
// @name         WSP_pageoperator
// @namespace    https://github.com/pertsevpy/WSP/
// @version      0.2.3
// @description  Improving the usability of the WSP interface operator's page
// @author       Pavel P.
// @license      Unlicense
// @updateURL    https://raw.githubusercontent.com/pertsevpy/WSP/main/WSP_pageoperator.user.js
// @downloadURL  https://raw.githubusercontent.com/pertsevpy/WSP/main/WSP_pageoperator.user.js
// @match        http://127.0.0.1:8000/pageoperator
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

console.log('Proton script start');

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
    const url = 'http://127.0.0.1:8000/api/managerobject/';

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
    let ob_info = document.getElementById('information');
    let ob_info2 = ob_info.getElementsByClassName('col-md-8');
    let addr = ob_info2[0].textContent;
    if (addr.trim() == ',') addr = '_ NO ADRESS _';
    document.getElementById('headAdress').innerHTML = addr;
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
                }
            }
    }
    addAdressToCard();
};

window.addEventListener('load', editObjCard(), false);
window.addEventListener('load', mainPageMod(), false);
setInterval(() => permanentUpdate(), 500);
