





  export function setActiveNav(path) {
  document.querySelectorAll(".nav-item,.nav-buttum").forEach(btn => {
    
    btn.classList.remove("active")
    if (btn.dataset.route === path) {
      btn.classList.add("active")
    }
  })
}


export function initNavigation() {
  document.querySelectorAll(".nav-item,.nav-bottum").forEach(btn => {
   
    btn.addEventListener("click", () => {
      
      
      const route = btn.dataset.route
      if (!route) return

      navigation.navigate(route)
    })
  })
}




