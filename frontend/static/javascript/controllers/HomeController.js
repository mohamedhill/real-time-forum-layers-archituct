import * as HomeView from "../views/HomeView.js";
import * as PostController from "./PostController.js";
import * as ReactionController from "./ReactionController.js";
import * as AuthController from "./AuthController.js";

export function showHomePage() {
  const { rightSidebar } = HomeView.renderHomePage();

  // Posts
  PostController.loadPosts();

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

  // Messages sidebar toggle
  const messagesBtn = document.getElementById("messagesBtn");
  if (messagesBtn) {
    messagesBtn.addEventListener("click", () => {
      rightSidebar.classList.toggle("visible");
      messagesBtn.classList.toggle("active");
    });
  }

  // Nav item active state
  Array.from(document.getElementsByClassName("nav-item"))
    .slice(1)
    .forEach((item) => {
      if (item.id !== "messagesBtn") {
        item.addEventListener("click", () => item.classList.toggle("active"));
      }
    });

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
     console.log(action);
     

      ReactionController.actionMap[action]?.(postId);
    });
  }
}
