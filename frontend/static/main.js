import { Router } from "./javascript/router/router.js";
import * as HomeView from "./javascript/views/HomeView.js";
import * as AuthController from "./javascript/controllers/AuthController.js";
import * as HomeController from "./javascript/controllers/HomeController.js";
import * as PostController from "./javascript/controllers/PostController.js";
import * as templates from "./javascript/components/componnets.js";
import * as messages from "./javascript/controllers/MessagesController.js"
import * as liked from "./javascript/controllers/LikedController.js"
import * as saved from "./javascript/controllers/SavedController.js"


//kayn mochkil event duplicate i will be fixed in the next commit




// Build DOM structures once at startup so route switches are instant.
HomeView.buildHomePage();

//  Router 

function pageNotFound() {
  document.body.innerHTML = templates.errorpage;
}



new Router()
    .on("/", () => AuthController.guardRoute(HomeController.showHomePage, "home"))
        .on("/login", () => AuthController.guardRoute(() => AuthController.showAuthPage('login'), "auth"))
    .on("/register", () => AuthController.guardRoute(() => AuthController.showAuthPage('register'), "auth"))
    .on("/messages", ({ url }) => AuthController.guardRoute(() => messages.ShowMessagesPage(url), "home"))
    .on("/likedpost",()=>AuthController.guardRoute(()=>liked.getlikedpost(),"home"))
    .on("/saved",()=>AuthController.guardRoute(()=>saved.getsavedpost(),"home"))
  .listen(pageNotFound);

// All form submissions are caught here and routed to the correct Controller.

document.body.addEventListener("submit", (e) => {
  if (e.target.id === "loginform") {
    e.preventDefault();
    AuthController.handleLogin();
  }

  if (e.target.id === "registerform") {
    e.preventDefault();
    AuthController.handleRegister();
  }

  if (e.target.id === "postForm") {
    e.preventDefault();
    PostController.handleCreatePost();
  }
});

