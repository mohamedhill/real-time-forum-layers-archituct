import * as helpers from "../helpers/helpers.js";
import * as auth from "../handlers/auth.js"
import * as creat from "../handlers/creatpost.js"
import * as components from "../components/componnets.js"
let authdiv;
let homediv;
const app = document.body;
const rightSidebar = document.createElement("div");
export let icons;

export function createLogin() {
  const access = document.createElement("div");
  access.className = "login__access";

  const title = document.createElement("h1");
  title.className = "login__title";
  title.textContent = "Log in to your account.";

  const area = document.createElement("div");
  area.className = "login__area";

  const form = document.createElement("form");
  form.id = "loginform";
  form.className = "login__form";

  const content = document.createElement("div");
  content.className = "login__content grid";

  const boxEmail = document.createElement("div");
  boxEmail.className = "login__box";

  const email = document.createElement("input");
  email.type = "text";
  email.id = "email";
  email.required = true;
  email.placeholder = " ";
  email.className = "login__input";

  const emailLabel = document.createElement("label");
  emailLabel.className = "login__label";
  emailLabel.textContent = "Email or Nickname";

  const emailIcon = document.createElement("i");
  emailIcon.className = "ri-mail-fill login__icon";

  boxEmail.append(email, emailLabel, emailIcon);

  const boxPass = document.createElement("div");
  boxPass.className = "login__box";

  const pass = document.createElement("input");
  pass.type = "password";
  pass.id = "password";
  pass.required = true;
  pass.placeholder = " ";
  pass.className = "login__input";

  const passLabel = document.createElement("label");
  passLabel.className = "login__label";
  passLabel.textContent = "Password";

  const passIcon = document.createElement("i");
  passIcon.className = "ri-eye-off-fill login__icon login__password";
  passIcon.id = "loginPassword";

  boxPass.append(pass, passLabel, passIcon);

  content.append(boxEmail, boxPass);

  const button = document.createElement("button");
  button.type = "submit";
  button.className = "login__button";
  button.textContent = "Login";

  form.append(content, button);

  const sw = document.createElement("p");
  sw.className = "login__switch";
  sw.append(document.createTextNode("Don't have an account? "));

  const swBtn = document.createElement("button");
  swBtn.id = "loginButtonRegister";
  swBtn.textContent = "Create Account";
  swBtn.type = "button";

  sw.appendChild(swBtn);

  area.append(form, sw);
  access.append(title, area);

  return access;
}

export function createRegister() {
  const reg = document.createElement("div");
  reg.className = "login__register";

  const title = document.createElement("h1");
  title.className = "login__title";
  title.textContent = "Create new account.";

  const area = document.createElement("div");
  area.className = "login__area";

  const form = document.createElement("form");
  form.id = "registerform";
  form.className = "login__form";

  const content = document.createElement("div");
  content.className = "login__content grid";

  content.append(
    input("nickname", "Nickname"),
    group(),
    input("emailCreate", "Email", "email"),
    password("passwordCreate", "loginPasswordCreate"),
  );

  const btn = document.createElement("button");
  btn.type = "submit";
  btn.className = "login__button";
  btn.textContent = "Create account";

  form.append(content, btn);

  const sw = document.createElement("p");
  sw.className = "login__switch";
  sw.append("Already have an account? ");

  const swBtn = document.createElement("button");
  swBtn.id = "loginButtonAccess";
  swBtn.textContent = "Log In";
  swBtn.type = "button";

  sw.appendChild(swBtn);

  area.append(form, sw);
  reg.append(title, area);

  return reg;
}

function input(id, label, type = "text") {
  const box = document.createElement("div");
  box.className = "login__box";

  const i = document.createElement("input");
  i.type = type;
  i.id = id;
  i.required = true;
  i.placeholder = " ";
  i.className = "login__input";

  const l = document.createElement("label");
  l.className = "login__label";
  l.textContent = label;

  box.append(i, l);
  return box;
}

function password(id, iconId) {
  const box = input(id, "Password");
  const icon = document.createElement("i");
  icon.className = "ri-eye-off-fill login__icon login__password";
  icon.id = iconId;
  box.appendChild(icon);
  return box;
}

function group() {
  const g = document.createElement("div");
  g.className = "login__group grid";

  g.append(
    input("firstname", "First Name"),
    input("lastname", "Last Name"),
    input("age", "Age","number"),
    gender(),
  );

  return g;
}

function gender() {
  const box = document.createElement("div");
  box.className = "login__box";

  const select = document.createElement("select");
  select.id = "gender";
  select.className = "login__input";

  const m = document.createElement("option");
  m.value = "Male";
  m.textContent = "Male";

  const f = document.createElement("option");
  f.value = "Female";
  f.textContent = "Female";

  select.append(m, f);

  const label = document.createElement("label");
  label.className = "login__label";
  label.textContent = "Gender";

  box.append(select, label);
  return box;
}

export function showerror(err, page) {
  let old = document.getElementById("loginerror");
  if (old) {
    old.innerText = err;
    return;
  }
  const error = document.createElement("p");
  error.id = "loginerror";
  error.className = "login error";
  error.innerText = err;
  if (page === "login") {
    let loginaccess = document.getElementsByClassName("login__access")[0];
    if (loginaccess.firstChild) {
      loginaccess.insertBefore(error, loginaccess.children[1] || null);
    }
  } else if (page === "register") {
    let registeraccess = document.getElementsByClassName("login__register")[0];
    if (registeraccess.firstChild) {
      registeraccess.insertBefore(error, registeraccess.children[1] || null);
    }
  }
}

export function creatAuth() {
  const header = document.createElement("header");
  const logo = document.createElement("img");
  const hreflogo = document.createElement("a");
  hreflogo.href = "/";
  logo.setAttribute("draggable","false")
  logo.id = "logo";
  logo.src = "static/img/logo.png";
  hreflogo.appendChild(logo);
  header.appendChild(hreflogo);

  const bg = document.createElement("img");
  bg.className = "backgroundlogin";
  bg.src = "static/img/back.png";

  const container = document.createElement("div");
  container.className = "login container grid";
  container.id = "loginAccessRegister";

  const login = createLogin();
  const register = createRegister();

  container.append(login, register);

  authdiv = {
    container: container,
    back: bg,
    header: header,
  };
}


export function createHomePage() {
  const container = document.createElement("div");
  container.className = "container";

  const sidebar = document.createElement("div");
  sidebar.className = "sidebar";
  sidebar.innerHTML = components.sidebar;

  const mainContent = document.createElement("div");
  mainContent.className = "main-content";
  mainContent.innerHTML = components.mainContent;

  rightSidebar.className = "right-sidebar";
  rightSidebar.innerHTML = components.rightSidebar;
  let creatpost =document.createElement('div')
  creatpost.id = "creatpostid"
  creatpost.innerHTML = components.creatpostdiv
  container.appendChild(sidebar);
  container.appendChild(mainContent);
  container.appendChild(rightSidebar);
  container.appendChild(creatpost)

  const bg = document.createElement("img");
  bg.className = "background";
  bg.id = "home-back";
  bg.src = "static/img/back.png";
  homediv = {
    container: container,
    back: bg,
  };
}

export function showhome() {
  app.innerHTML = "";
  app.append(homediv.container);
  app.append(homediv.back);

  helpers.loadPosts()
  
  
  
  icons = document.querySelectorAll("i[data-theme]");
  
  helpers.setTheme(localStorage.getItem("theme") || "light");
  
  icons.forEach((icon) => {
    icon.addEventListener("click", () =>
      helpers.setTheme(icon.getAttribute("data-theme")),
  );
});

const messagesBtn = document.getElementById("messagesBtn");
messagesBtn.addEventListener("click", () => {
  rightSidebar.classList.toggle("visible");
  messagesBtn.classList.toggle("active");
});

const btn = document.getElementById("showloginbtn");
btn.addEventListener("click", e => {
  e.preventDefault(); 
  
  auth.Logout();
});
helpers.navactive()
helpers.showcreatpost()
helpers.selectorcategoy()
let btns = document.getElementsByClassName('action-btn');
 //console.log(btns);
 
 let postdiv =document.getElementById("posts-container")
helpers.actionevents(postdiv)




}
export function showAuth() {
  app.innerHTML = "";
  app.className = ""
  app.append(authdiv.header);
  app.append(authdiv.back);
  app.append(authdiv.container);
  helpers.PasswordAccess("password", "loginPassword","password");
  helpers.PasswordRegister("passwordCreate", "loginPasswordCreate","password");
helpers.checkinput()
  helpers.Swaploginregister();
}


