import * as HomeView from "../views/HomeView.js";
import * as PostController from "./PostController.js";
import * as ReactionController from "./ReactionController.js";
import * as AuthController from "./AuthController.js";
import * as navigate from "../navigation/Navigation.js";
import * as MessagesController from "./MessagesController.js";

function bindPostActionDelegation() {
  const postsContainer = document.getElementById("posts-container");
  if (!postsContainer || postsContainer.dataset.actionsBound === "true") return;

  postsContainer.dataset.actionsBound = "true";
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

export function initializeHomeShell(activeRoute = "/") {
  const { rightSidebar } = HomeView.renderHomePage();
  MessagesController.resetMessagesViewState();
  HomeView.resetMainContentShell();
  navigate.setActiveNav(activeRoute);
  rightSidebar.classList.remove("visible");

  const nicknameTrigger = document.getElementById("nicknameuser");
  if (nicknameTrigger) {
    nicknameTrigger.textContent = window.currentUser
      ? window.currentUser.charAt(0).toUpperCase()
      : "A";
  }

  const savedTheme = localStorage.getItem("theme") || "light";
  HomeView.applyTheme(savedTheme);

  document.querySelectorAll("i[data-theme]").forEach((icon) => {
    icon.addEventListener("click", () =>
      HomeView.applyTheme(icon.getAttribute("data-theme"))
    );
  });

  const logoutBtn = document.getElementById("showloginbtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      AuthController.handleLogout();
    });
  }

  const profileBtn = document.getElementById("showprofilebtn");
  if (profileBtn) {
    profileBtn.addEventListener("click", (e) => {
      e.preventDefault();
      navigation.navigate("/profile");
    });
  }

  const profileWrapper = document.getElementById("customProfileWrapper");
  if (profileWrapper) {
    profileWrapper.onclick = (event) => {
      event.stopPropagation();
      profileWrapper.classList.toggle("is-open");
    };
  }

  if (!window.profileDropdownCloser) {
    window.profileDropdownCloser = () => {
      const wrapper = document.getElementById("customProfileWrapper");
      if (wrapper && wrapper.classList.contains("is-open")) {
        wrapper.classList.remove("is-open");
      }
    };
    document.addEventListener("click", window.profileDropdownCloser);
  }

  navigate.initNavigation();
  bindPostActionDelegation();
  return { rightSidebar };
}

export function showHomePage() {
  initializeHomeShell("/");

  PostController.loadPosts();
  MessagesController.initializeOnlineUsers();

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

  document.querySelectorAll(".category-btn").forEach((btn) => {
    btn.addEventListener("click", () => btn.classList.toggle("active"));
  });

}
