import * as AuthModel from "../models/AuthModel.js";
import * as AuthView from "../views/AuthView.js";
import { disconnectMessagesSocket } from "./MessagesController.js";
import * as MessageModel from "../models/MessageModel.js";
import { Checkvalid } from "../helpers/checkvalidityinfo.js";




//  Navigation helper 

let _isNavigating = false;

function safeNavigate(path) {
  if (_isNavigating) return;
  _isNavigating = true;
  navigation.navigate(path);
  setTimeout(() => (_isNavigating = false), 50);
}

function applySessionUser(data) {
  const nickName = data?.nickname || null;
  const userID = Number(data?.userID);

  window.currentUser = nickName;
  window.currentUserId = Number.isNaN(userID) ? null : userID;
}

function clearSessionUser() {
  window.currentUser = null;
  window.currentUserId = null;
}

function getRegisterErrorMessage(status, json) {
  const serverMessage = json?.error?.trim?.() || "";
  if (serverMessage) return serverMessage;

  if (status === 409) {
    return "This nickname or email is already in use.";
  }

  if (status === 400) {
    return "Please check your registration details and try again.";
  }

  if (status >= 500) {
    return "Registration failed on the server. Please try again.";
  }

  return "Something went wrong while creating your account.";
}

//  Route guard 

export async function guardRoute(onGranted, routeType) {
  const result = await AuthModel.checkSession();

  if (!result.ok) {
    clearSessionUser();

    if (routeType === "home") {
      safeNavigate("/login");
      return;
    }

    onGranted();
    return;
  }

  applySessionUser(result.data);

  if (routeType === "auth") {
    safeNavigate("/");
    return;
  }

  onGranted();
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
      AuthView.showError(getRegisterErrorMessage(status, json), "register");
      return;
    }
    if (status === 201) {
      safeNavigate("/");
    }
  } catch (error) {
    AuthView.showError(error?.message || "Network error. Please try again.", "register");
  }
}

//  Login 

export async function handleLogin() {
  const identifier = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const { ok, data: json } = await AuthModel.login(identifier, password);

    if (!ok) {
      AuthView.showError(json?.error || "Something went wrong", "login");
      return;
    }
    safeNavigate("/");
  } catch (error) {
    AuthView.showError(error?.message || "Network error. Please try again.", "login");
  }
}

//  Logout 

export async function handleLogout() {
  try {
    disconnectMessagesSocket();
    MessageModel.clearState();
    await AuthModel.logout();
  } finally {
    clearSessionUser();
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
