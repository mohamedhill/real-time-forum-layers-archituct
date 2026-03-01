import * as HomeView from "../views/HomeView.js";
import * as PostController from "./PostController.js";
import * as ReactionController from "./ReactionController.js";
import * as AuthController from "./AuthController.js";
import * as navigate from "../navigation/Navigation.js"

export function showHomePage() {
  const { rightSidebar } = HomeView.renderHomePage();
navigate.setActiveNav("/")
rightSidebar.classList.remove('visible')
  // Posts
  PostController.loadPosts();

  //set nick name in the profile sidebar

  const nicknameTrigger = document.getElementById("nicknameuser");
  if (nicknameTrigger) {
    nicknameTrigger.textContent = window.currentUser
      ? window.currentUser.charAt(0).toUpperCase()
      : "A";
  }

  // Theme
  const savedTheme = localStorage.getItem("theme") || "light";
  HomeView.applyTheme(savedTheme);

  document.querySelectorAll("i[data-theme]").forEach((icon) => {
    icon.addEventListener("click", () =>
      HomeView.applyTheme(icon.getAttribute("data-theme"))
    );
  });

  // Logout
  const logoutBtn = document.getElementById("showloginbtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      AuthController.handleLogout();
    });
  }


  const profileWrapper = document.getElementById('customProfileWrapper');

  if (profileWrapper) {
    // Using event delegation to avoid duplicate listeners
    profileWrapper.onclick = (event) => {
      event.stopPropagation(); 
      profileWrapper.classList.toggle('is-open');
    };
  }

  // Close dropdown when clicking anywhere else (only add once per session)
  if (!window.profileDropdownCloser) {
    window.profileDropdownCloser = () => {
      const wrapper = document.getElementById('customProfileWrapper');
      if (wrapper && wrapper.classList.contains('is-open')) {
        wrapper.classList.remove('is-open');
      }
    };
    document.addEventListener('click', window.profileDropdownCloser);
  }
  // Messages sidebar toggle
/*   const messagesBtn = Array.from(document.getElementsByClassName("messagesBtn"));


  if (messagesBtn) {
    messagesBtn.forEach((msg) => {

      msg.addEventListener("click", () => {

        if (msg.id === "buttommsg") {
          const main = document.getElementsByClassName('main-content')[0]
          main.classList.toggle("hidden")
        }

        rightSidebar.classList.toggle("visible")
        msg.classList.toggle("active")
      })
    })
  } */

  // Nav item active state

 /*  document.querySelectorAll(".nav-item, .nav-bottum")
    .forEach((item) => {
      if (!item.classList.contains("messagesBtn")) {
        item.addEventListener("click", () => {
          item.classList.toggle("active")
        })
      }
    })
 */

    navigate.initNavigation()
  



  // Create-post modal triggers
  const creatPostBtn = document.getElementById("creat-post-btn");
  const writeSomethingBtn = document.getElementById("writesomething");
  const closeBtn = document.getElementById("close-btn");

  creatPostBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    HomeView.showCreatePostModal();
  });

  writeSomethingBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    HomeView.showCreatePostModal();
  });

  closeBtn?.addEventListener("click", () => HomeView.hideCreatePostModal());

  // Category selection in the create-post modal
  document.querySelectorAll(".category-btn").forEach((btn) => {
    btn.addEventListener("click", () => btn.classList.add("active"));
  });

  // Reaction events (delegated on posts container)
  const postsContainer = document.getElementById("posts-container");
  if (postsContainer) {
    postsContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".action-btn");

      if (!btn || !postsContainer.contains(btn)) return;

      const postCard = btn.closest(".post-card");
      if (!postCard) return;

      const postId = postCard.dataset.postId;
      const action = btn.dataset.action;
      if (!postId || !action) return;
     


      ReactionController.actionMap[action]?.(postId);
    });
  }
}




