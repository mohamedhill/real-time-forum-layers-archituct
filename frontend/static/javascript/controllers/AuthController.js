import * as AuthModel from "../models/AuthModel.js";
import * as AuthView from "../views/AuthView.js";
import { Checkvalid } from "../helpers/checkvalidityinfo.js";

//  Navigation helper 

let _isNavigating = false;

function safeNavigate(path) {
  if (_isNavigating) return;
  _isNavigating = true;
  navigation.navigate(path);
  setTimeout(() => (_isNavigating = false), 50);
}

//  Route guard 

export async function guardRoute(onGranted, routeType) {
 
  
  try {
    const status = await AuthModel.checkSession();

    if (routeType === "home" && status === 401) {
      safeNavigate("/login");
      return;
    }
    if (routeType === "auth" && status === 200) {
      safeNavigate("/");
      return;
    }
    onGranted();
  } catch {
    if (routeType === "home") safeNavigate("/login");
    else onGranted();
  }
}

//  Register 

export async function handleRegister() {
  const data = {
    nickname: document.getElementById("nickname").value,
    age: Number(document.getElementById("age").value),
    gender: document.getElementById("gender").value,
    firstName: document.getElementById("firstname").value,
    lastName: document.getElementById("lastname").value,
    email: document.getElementById("emailCreate").value,
    password: document.getElementById("passwordCreate").value,
  };

  const validationError = Checkvalid(data);
  if (validationError) {
    AuthView.showError(validationError, "register");
    return;
  }

  try {
    const { ok, status, data: json } = await AuthModel.register(data);

    if (!ok) {
      AuthView.showError(json.error || "Something went wrong", "register");
      return;
    }
    if (status === 201) {
      safeNavigate("/");
    }
  } catch {
    AuthView.showError("Network error. Please try again.", "register");
  }
}

//  Login 

export async function handleLogin() {
  const identifier = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const { ok, data: json } = await AuthModel.login(identifier, password);

    if (!ok) {
      AuthView.showError(json.error || "Something went wrong", "login");
      return;
    }
    safeNavigate("/");
  } catch {
    AuthView.showError("Network error. Please try again.", "login");
  }
}

//  Logout 

export async function handleLogout() {
  try {
    await AuthModel.logout();
  } finally {
    safeNavigate("/login");
  }
}

//  Show Auth Page 

export function showAuthPage(type) {
  
  AuthView.renderAuthPage();
  const container = document.getElementById("loginAccessRegister");
if (type=='register'){
 container.classList.remove("active");    
  
  requestAnimationFrame(() => {
    container.classList.add("active");
  });
}
if (type === 'login'){

 container.classList.add("active");    

    requestAnimationFrame(() => {
    container.classList.remove("active");
  });
}
  AuthView.togglePasswordVisibility("password", "loginPassword");
  AuthView.togglePasswordVisibility("passwordCreate", "loginPasswordCreate");
  AuthView.bindSwapLoginRegister();
  AuthView.bindInputValidationStyles();
}
