import './js/remake-init';

import docCookie from "./js/cookie-lib";

// fake user login
document.body.addEventListener("click", function (event) {
  if (event.target.matches("a") && event.target.closest(".login-row")) {
    event.preventDefault();
    docCookie.setItem("user", event.target.innerText.toLowerCase());
    document.location.reload();
  }
});

window.docCookie = docCookie;