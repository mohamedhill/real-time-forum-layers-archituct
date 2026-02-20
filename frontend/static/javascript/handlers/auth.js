import *  as check from '../helpers/checkvalidityinfo.js'
import *  as showpages from '../showpages/showpages.js'


export async function Register() {

  const datas = {
    nickname: document.getElementById("nickname").value,
    age: Number(document.getElementById("age").value),
    gender: document.getElementById("gender").value,
    firstName: document.getElementById("firstname").value,
    lastName: document.getElementById("lastname").value,
    email: document.getElementById("emailCreate").value,
    password: document.getElementById("passwordCreate").value,

  };


  let err = check.Checkvalid(datas)

  if (err) {
  showpages.showerror(err)
  }

try {
    const res = await fetch("/registerAuth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        datas
      )
    })
    const data = await res.json();


    if (!res.ok){
     // console.log(data.error);
      
      showpages.showerror(data.error,'register')
    }

    if (res.status === 201) {

         safeNavigate("/")


    

    }

  } catch (err) {
    
    showpages.showerror("Network error. Please try again.",'register');


  }

}

export async function Login() {  
  const datalogin = {
    identifier: document.getElementById("email").value,
    password: document.getElementById("password").value
  }

  try {
    const res = await fetch("/loginAuth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datalogin)
    })

    const data = await res.json();

    if (!res.ok){
      showpages.showerror(data.error || "Something went wrong",'login');
      return;
    }

    if (res.status === 200) {
       safeNavigate("/")

    }

  } catch (err) {
    showpages.showerror("Network error. Please try again.",'login');
    
  }
}

export async function guardRoute(callback, rout) {
  try {
    const res = await fetch("/check-session", { credentials: "include" });

    if (rout === "home" && res.status === 401) {
      safeNavigate("/login");
      return;
    }

    if (rout === "auth" && res.status === 200) {
      safeNavigate("/");
      return;
    }

    callback();
  } catch {
    if (rout === "home") {
      safeNavigate("/login");
    } else {
      callback();
    }
  }
}

export async function Logout() {
  try {
    await fetch("/logout", { method: "POST", credentials: "include" });
    safeNavigate("/login");
  } catch {
    safeNavigate("/login");
  }
}

let isNavigating = false;

function safeNavigate(path) {
  if (isNavigating) return; 
  isNavigating = true;

  navigation.navigate(path);


  setTimeout(() => {
    isNavigating = false;
  }, 50);
}


