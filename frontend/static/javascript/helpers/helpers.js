import { icons } from "../showpages/showpages.js"


export function PasswordAccess(loginPass, loginEye) {
    const input = document.getElementById(loginPass)
    const iconEye = document.getElementById(loginEye)
    if (!input || !iconEye) return

    iconEye.addEventListener('click', () => {
        if (input.type === 'password') {
            input.type = 'text'
            iconEye.classList.remove('ri-eye-off-fill')
            iconEye.classList.add('ri-eye-fill')
        } else {
            input.type = 'password'
            iconEye.classList.remove('ri-eye-fill')
            iconEye.classList.add('ri-eye-off-fill')
        }
    })
}


export const PasswordRegister = (loginPass, loginEye) => {
    const input = document.getElementById(loginPass)
    const iconEye = document.getElementById(loginEye)
    if (!input || !iconEye) return

    iconEye.addEventListener('click', () => {
        if (input.type === 'password') {
            input.type = 'text'
            iconEye.classList.remove('ri-eye-off-fill')
            iconEye.classList.add('ri-eye-fill')
        } else {
            input.type = 'password'
            iconEye.classList.remove('ri-eye-fill')
            iconEye.classList.add('ri-eye-off-fill')
        }
    })
}


export function Swaploginregister(){
    
const loginAcessRegister = document.getElementById('loginAccessRegister'),
    buttonRegister = document.getElementById('loginButtonRegister'),
    buttonAccess = document.getElementById('loginButtonAccess')


if (!loginAcessRegister || !buttonRegister || !buttonAccess) return


buttonRegister.addEventListener('click', () => {
  
    loginAcessRegister.classList.add('active')
  
    
})

buttonAccess.addEventListener('click', () => {

    loginAcessRegister.classList.remove('active')
   
    
})
}


export function setTheme(theme) {
   

    
    let dark = document.getElementById("dark")
    let light = document.getElementById("light")
    let logo = document.getElementById('homelogo')
    let back = document.getElementById('home-back')
    if (theme === 'dark') {
        light.style.display= "flex"
        dark.style.display= "none" 

        logo.src = "static/img/darklogo.png"
        back.src = 'static/img/darkback.png'
        
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
    } else {
       
        
     dark.style.display= "flex"
        light.style.display= "none" 


         logo.src = "static/img/logo.png"
        back.src = 'static/img/back.png'
        


        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
    }

    icons.forEach(icon => {
        icon.classList.remove('active');
        if (icon.getAttribute('data-theme') === theme) icon.classList.add('active');
    });

    localStorage.setItem('theme', theme);
}


export function checkinput(){
    const inputs = document.querySelectorAll('input');

//console.log(inputs);

    inputs.forEach(input => {
      input.addEventListener('blur', () => { 
        if (!input.value.trim()) {
          input.classList.add('invalid');
        } else {
          input.classList.remove('invalid');
        }
      });
    
      input.addEventListener('focus', () => {
        input.classList.remove('invalid');
      });
    });
}




export function selectorcategoy(){

const buttons = document.querySelectorAll('.category-btn');

buttons.forEach(button => {
  button.addEventListener('click', () => {
    button.classList.add('active');
  });
});

}



export function showcreatpost() {
    const creatpostdiv = document.getElementById('creatpostid');
    const creatpostbtn = document.getElementById('creat-post-btn');
    const  closebtn= document.getElementById('close-btn');
    const writesomething = document.getElementById('writesomething')    

   writesomething.addEventListener('click',(e)=>{
     e.stopPropagation(); 
    creatpostdiv.style.display = "block"

   })



    creatpostbtn.addEventListener("click", (e) => {
        e.stopPropagation(); 
        creatpostdiv.style.display = "block";
    });

  
      closebtn.addEventListener("click", (e) => {
        creatpostdiv.style.display = 'none'
    }); 

 
}


 export function showmessagebtn(){

    const messagesBtn = document.getElementById("messagesBtn");
    messagesBtn.addEventListener("click", () => {
      rightSidebar.classList.toggle("visible");
     messagesBtn.classList.toggle("active");
    });
  }


    export function themeswitcher(){
  
      icons = document.querySelectorAll("i[data-theme]");
    
      helpers.setTheme(localStorage.getItem("theme") || "light");
    
      icons.forEach((icon) => {
        icon.addEventListener("click", () =>
          helpers.setTheme(icon.getAttribute("data-theme")),
        );
      });
    }
   

     export function logoutlisten(){

   const btn = document.getElementById("showloginbtn");
  btn.addEventListener("click", e => {
   e.preventDefault(); 
   auth.Logout();
  });
 }


 export function navactive(){

let navitems = Array.from(document.getElementsByClassName('nav-item')).slice(1)
//console.log(navitems);

navitems.forEach((item)=>{

    if (item.id !== "messagesBtn"){

        item.addEventListener("click",()=>{
          item.classList.toggle("active");
    
    
        })
    }
})



 }

export async  function loadPosts() {
    const res = await fetch("posts");
    const posts = await res.json();
  
   // console.log(posts);
    const container = document.getElementById("posts-container");
    container.className = "posts-grid";
    container.innerHTML = ""; 
    
    let  postdivs = creatdivposts(posts)
    container.append(...postdivs);
    
  }


  

  
  
  
export function creatdivposts(posts,type) {
    const container = document.getElementById("posts-container");

 if (type==='single'){

     container.prepend(creatonepost(posts)) ;
      return

 }
   

   let listposts= posts.map(post => {
     return creatonepost(post)
    });
   // console.log(listposts);
    
    return listposts
}


export function creatonepost(post) {
    
    const postDiv = document.createElement("div");
    postDiv.className = "post-card";

    const postBody = document.createElement("div");
    postBody.className = "post-body";

    const postHeader = document.createElement("div");
    postHeader.className = "post-header";

    const avatar = document.createElement("div");
    avatar.className = "user-avatar";
    avatar.textContent = post.nickname
        ? post.nickname.charAt(0).toUpperCase()
        : "?";

    const userMeta = document.createElement("div");
    userMeta.className = "user-meta";

    const username = document.createElement("h4");
    username.className = "username";
    username.textContent = post.nickname || "Unknown";

    const postTime = document.createElement("span");
    postTime.className = "post-time";
postTime.textContent = new Date().toLocaleTimeString([], {
  hour: "2-digit",
  minute: "2-digit",
});

    
    

    const title = document.createElement("h3");
    title.className = "post-title";
    title.textContent = post.title;

    const content = document.createElement("p");
    content.className = "post-content";
    content.textContent = post.content;

    const actions = document.createElement("div");
    actions.className = "post-actions";

    actions.innerHTML = `
        <div class="action-group">
            <button class="action-btn like">
                <i class="fa-regular fa-thumbs-up intrection"></i>
                <span class="count">0</span>
            </button>

            <button class="action-btn dislike">
                <i  class="fa-regular fa-thumbs-down intrection"></i>
                <span class="count">0</span>

            </button>

            <button class="action-btn comment">
                <i class="fa-regular fa-comment intrection"></i>
                <span class="count">0</span>
            </button>
        </div>

        <button class="action-btn save">
            <i class="fa-regular fa-bookmark intrection"></i>
        </button>
    `;
    //console.log(post);  
     let categories = document.createElement("div")
     categories.id = 'categoriescontainer'
  
     
       post.categories.forEach(category => {
     
        let btn =document.createElement('button')
        btn.className = "category-btn"
        btn.innerText = category
        categories.append(btn)
        
       }); 
            //console.log(category);
            
         
    
    userMeta.appendChild(username);
    userMeta.appendChild(postTime);

    postHeader.appendChild(avatar);
    postHeader.appendChild(userMeta);

    postBody.appendChild(postHeader);
    postBody.appendChild(title);
    postBody.appendChild(content);

    postDiv.appendChild(postBody);
   postDiv.appendChild(categories)
    postDiv.appendChild(actions);

    return postDiv;
}
