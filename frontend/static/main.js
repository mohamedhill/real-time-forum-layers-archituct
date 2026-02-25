import { Router } from "./javascript/router/router.js";
import * as HomeView from "./javascript/views/HomeView.js";
import * as AuthController from "./javascript/controllers/AuthController.js";
import * as HomeController from "./javascript/controllers/HomeController.js";
import * as PostController from "./javascript/controllers/PostController.js";
import * as templates from "./javascript/components/componnets.js";



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
