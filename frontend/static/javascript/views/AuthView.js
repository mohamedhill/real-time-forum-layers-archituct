
//  Builders 
function buildInputBox(id, labelText, type = "text") {
  const box = document.createElement("div");
  box.className = "login__box";

  const input = document.createElement("input");
  input.type = type;
  input.id = id;
  input.required = true;
  input.placeholder = " ";
  input.className = "login__input";

  const label = document.createElement("label");
  label.className = "login__label";
  label.textContent = labelText;

  box.append(input, label);
  return box;
}

function buildPasswordBox(id, iconId) {
  const box = buildInputBox(id, "Password");
  box.querySelector("input").type = "password";

  const icon = document.createElement("i");
  icon.className = "ri-eye-off-fill login__icon login__password";
  icon.id = iconId;
  box.appendChild(icon);
  return box;
}

function buildGenderBox() {
  const box = document.createElement("div");
  box.className = "login__box";

  const select = document.createElement("select");
  select.id = "gender";
  select.className = "login__input";

  ["Male", "Female"].forEach((val) => {
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = val;
    select.appendChild(opt);
  });

  const label = document.createElement("label");
  label.className = "login__label";
  label.textContent = "Gender";

  box.append(select, label);
  return box;
}

function buildRegisterGroup() {
  const g = document.createElement("div");
  g.className = "login__group grid";
  g.append(
    buildInputBox("firstname", "First Name"),
    buildInputBox("lastname", "Last Name"),
    buildInputBox("age", "Age", "number"),
    buildGenderBox()
  );
  return g;
}

export function buildLoginForm() {
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

  // Email box with icon
  const emailBox = buildInputBox("email", "Email or Nickname");
  const emailIcon = document.createElement("i");
  emailIcon.className = "ri-mail-fill login__icon";
  emailBox.appendChild(emailIcon);

  content.append(emailBox, buildPasswordBox("password", "loginPassword"));

  const btn = document.createElement("button");
  btn.type = "submit";
  btn.className = "login__button";
  btn.textContent = "Login";

  form.append(content, btn);

  const sw = document.createElement("p");
  sw.className = "login__switch";
  sw.append(document.createTextNode("Don't have an account? "));

  const swBtn = document.createElement("a");
  swBtn.id = "loginButtonRegister";
  swBtn.textContent = "Create Account";
  swBtn.src = "/register";
  sw.appendChild(swBtn);

  area.append(form, sw);
  access.append(title, area);
  return access;
}

export function buildRegisterForm() {
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
    buildInputBox("nickname", "Nickname"),
    buildRegisterGroup(),
    buildInputBox("emailCreate", "Email", "email"),
    buildPasswordBox("passwordCreate", "loginPasswordCreate")
  );

  const btn = document.createElement("button");
  btn.type = "submit";
  btn.className = "login__button";
  btn.textContent = "Create account";

  form.append(content, btn);

  const sw = document.createElement("p");
  sw.className = "login__switch";
  sw.append("Already have an account? ");

  const swBtn = document.createElement("a");
  swBtn.id = "loginButtonAccess";
  swBtn.textContent = "Log In";
  swBtn.src = "/login";
  sw.appendChild(swBtn);

  area.append(form, sw);
  reg.append(title, area);
  return reg;
}

//  Page Renderer 

/**
 * Renders the full auth page into document.body.
 * Returns references needed by the controller.
 */
export function renderAuthPage() {
  const app = document.body;
  app.innerHTML = "";
  app.className = "";

  const header = document.createElement("header");
  const hrefLogo = document.createElement("a");
  hrefLogo.href = "/";
  const logo = document.createElement("img");
  logo.setAttribute("draggable", "false");
  logo.id = "logo";
  logo.src = "/static/img/logo-remove.png";
  hrefLogo.appendChild(logo);
  header.appendChild(hrefLogo);

  const bg = document.createElement("img");
  bg.className = "backgroundlogin";
  bg.src = "/static/img/back.png";

  const container = document.createElement("div");
  container.className = "login container grid";
  container.id = "loginAccessRegister";

  const loginForm = buildLoginForm();
  const registerForm = buildRegisterForm();
  container.append(loginForm, registerForm);

  app.append(header, bg, container);

  return { container, loginForm, registerForm };
}

//  UI Updates 

export function showError(message, page) {
  let old = document.getElementById("loginerror");
  if (old) {
    old.innerText = message;
    return;
  }

  const error = document.createElement("p");
  error.id = "loginerror";
  error.className = "login error";
  error.innerText = message;

  if (page === "login") {
    const el = document.getElementsByClassName("login__access")[0];
    if (el) el.insertBefore(error, el.children[1] || null);
  } else if (page === "register") {
    const el = document.getElementsByClassName("login__register")[0];
    if (el) el.insertBefore(error, el.children[1] || null);
  }
}

export function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!input || !icon) return;

  icon.addEventListener("click", () => {
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    icon.classList.toggle("ri-eye-off-fill", !isPassword);
    icon.classList.toggle("ri-eye-fill", isPassword);
  });
}

export function bindSwapLoginRegister() {
  const container = document.getElementById("loginAccessRegister");
  const toRegister = document.getElementById("loginButtonRegister");
  const toLogin = document.getElementById("loginButtonAccess");
  if (!container || !toRegister || !toLogin) return;

  toRegister.addEventListener("click", () =>  navigation.navigate("/register"));
  toLogin.addEventListener("click", ()=> navigation.navigate("/login"));
}

export function bindInputValidationStyles() {
  document.querySelectorAll("input").forEach((input) => {
    input.addEventListener("blur", () => {
      input.classList.toggle("invalid", !input.value.trim());
    });
    input.addEventListener("focus", () => input.classList.remove("invalid"));
  });
}
