// ==UserScript==
// @name         WSP_pageoperator
// @namespace    https://github.com/pertsevpy/WSP/
// @version      0.1
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

console.log('Proton script start');

function delTopAligh() {
    // removing the alignment in the header of the card, which spoils everything
    // or for class 'col-lg-12 col-md-12 col-sm-12 col-xs-12 col-md-offset-4'
    // del 'col-md-offset-4'
    let headingElement = document.querySelector('.col-md-offset-4');
    headingElement.style.marginLeft = '10pt';
}

function addIDtoTile() {
    // required for normal navigation in other func
    // if it breaks again, move it to document.onclick
    let spans = document.getElementsByClassName('ProductTile');

    for (let i=0; i<spans.length; i++) {
        spans[i].id = String(spans[i].textContent);
        //console.log(spans[i].textContent);
    }
    addObjNamesToTile();
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
    // increasing the information content of the object card
    let h5addr = document.createElement('h5');
    h5addr.id = 'headAdress';
    h5addr.innerHTML = '';
    document.getElementsByClassName(
        'col-lg-12 col-md-12 col-sm-12 col-xs-12 col-md-offset-4')[0]
        .append(h5addr);
    addAdressToCard(); // set the current address
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
    if (window.location.href.includes('pageoperator')) {
        console.log('right click block: ');
        //console.log(e);
        return false;
    }
};

document.onclick = function(e) {
    console.log('click on:');
    console.log(e);
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

window.addEventListener('load', delTopAligh(), false);
window.addEventListener('load', addIDtoTile(), false);
window.addEventListener('load', editObjCard(), false);
setInterval(() => permanentUpdate(), 500);
