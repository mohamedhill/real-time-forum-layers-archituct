import *  as helpers from './javascript/helpers/helpers.js'
import *  as showpages from './javascript/showpages/showpages.js'
import *  as auth from './javascript/handlers/auth.js'
import *  as check from './javascript/helpers/checkvalidityinfo.js'
import { Router } from "./javascript/router/router.js";
import * as creatpost from "./javascript/handlers/creatpost.js"


let onetime = false
if (!onetime){

  showpages.creatAuth()
   showpages.createHomePage() 
}

onetime = true





let app = document.body


function PageNotFound() {
    app.innerHTML = "<h1>Error</h1>"
}
new Router()
  .on("/", () => auth.guardRoute(showpages.showhome,"home"))
  .on("/login", () => auth.guardRoute(showpages.showAuth,"auth"))
  .listen(PageNotFound);

document.body.addEventListener("submit", e => {
  if (e.target.id === "loginform") {
    e.preventDefault(); 
    auth.Login();
  }

  if (e.target.id === "registerform") {
    e.preventDefault();
    auth.Register();
  }

  if (e.target.id === "postForm"){
    e.preventDefault();
    creatpost.creathandler()


  }
});




