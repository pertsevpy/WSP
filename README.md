# WSP User Scripts
This script will be useful for those who are forced to use WPS software.
If you accidentally found this repository, you don't need it.

Use Tampermonkey or a similar plugin for your browser.


##Verified on WSP V37.0.0.25

### WSP_pageoperator_ui.user.js
UI improvements for the WSP operator: font, tiles, accordion, ribbon click, tooltip, connection indicator, tab memory, one‑time activation of hiding checkboxes.


The following scripts
##DEPRECATED!
Left for compatibility with servers of version below 30.*:

### WSP_pageoperator.user.js
Improvements to the main operator work window.
Correct the formatting of the object name in the card, add the address to the card.
Add a button in the events tab to generate a report with a long period of time. ATTENTION! The request takes a noticeable amount of time, a limit of 1 request per 60 seconds is set (the button is inactive).
Added pop-up names of objects when hovering over tiles, added a filter for tiles by object name.
Automatically enable the event filter when opening a page. Block the right mouse button, request when trying to refresh the page, close the tab/browser.
Opening the object card when clicking on the name or number of the object in the event feed.
Minor improvements.

### WSP_menu_main_page.user.js
Add a button to the main menu to generate an engineering report - a list of objects with contact information.
Use with caution, the request takes a noticeable amount of time.

### WSP_pagemanageraccess.user.js
Synchronization of objects for all users. We modify the assigned objects for one user and propagate the changes to the others.
