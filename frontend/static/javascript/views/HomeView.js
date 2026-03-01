import * as templates from "../components/componnets.js";
//test commit
// Singleton DOM references (created once, reused on route changes)
let _homeDom = null;

export function buildHomePage() {
  const container = document.createElement("div");
  container.className = "container";

  const sidebar = document.createElement("div");
  sidebar.className = "sidebar";
  sidebar.innerHTML = templates.sidebar;

  const mainContent = document.createElement("div");
  mainContent.className = "main-content";
  mainContent.innerHTML = templates.mainContent;

  const rightSidebar = document.createElement("div");
  rightSidebar.className = "right-sidebar";
  rightSidebar.innerHTML = templates.rightSidebar;

  const createPostModal = document.createElement("div");
  createPostModal.id = "creatpostid";
  createPostModal.innerHTML = templates.creatpostdiv;

  const Mobilenav = document.createElement("div");
  Mobilenav.className ="mobile-nav";
  Mobilenav.innerHTML = templates.mobilenav;

  container.append(sidebar, mainContent,Mobilenav ,rightSidebar, createPostModal);

  const bg = document.createElement("img");
  bg.className = "background";
  bg.id = "home-back";
  bg.src = "static/img/back.png";

  _homeDom = { container, rightSidebar, bg };
}

export function renderHomePage() {
  const app = document.body;
  app.innerHTML = "";
  app.append(_homeDom.container, _homeDom.bg);
  return _homeDom;
}

export function getRightSidebar() {
  return _homeDom?.rightSidebar;
}

//  Theme 

export function applyTheme(theme) {
  const dark = document.getElementById("dark");
  const light = document.getElementById("light");
  const logo = document.getElementById("homelogo");
  const back = document.getElementById("home-back");

  if (theme === "dark") {
    if (light) light.style.display = "flex";
    if (dark) dark.style.display = "none";
    if (logo) logo.src = "static/img/logo-remove.png";
    if (back) back.src = "static/img/darkback.png";
    document.body.classList.add("dark-mode");
    document.body.classList.remove("light-mode");
  } else {
    if (dark) dark.style.display = "flex";
    if (light) light.style.display = "none";
    if (logo) logo.src = "static/img/logo-remove.png";
    if (back) back.src = "static/img/back.png";
    document.body.classList.remove("dark-mode");
    document.body.classList.add("light-mode");
  }

  document.querySelectorAll("i[data-theme]").forEach((icon) => {
    icon.classList.toggle("active", icon.getAttribute("data-theme") === theme);
  });

  localStorage.setItem("theme", theme);
}

//  Create-Post Modal 

export function showCreatePostModal() {
  const modal = document.getElementById("creatpostid");
  if (modal) modal.style.display = "block";
}

export function hideCreatePostModal() {
  const modal = document.getElementById("creatpostid");
  if (modal) modal.style.display = "none";
}

//  Post Cards 

export function buildPostCard(post) {
  const postDiv = document.createElement("div");
  postDiv.className = "post-card";
  
  postDiv.dataset.postId = post.id;

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

  const date = new Date(post.time)
const formattedTime = date.toLocaleString("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true
})

  postTime.className = "post-time";
  postTime.textContent = formattedTime;

  userMeta.append(username, postTime);
  postHeader.append(avatar, userMeta);

  const title = document.createElement("h3");
  title.className = "post-title";
  title.textContent = post.title;

  const content = document.createElement("p");
  content.className = "post-content";
  content.textContent = post.content;

  postBody.append(postHeader, title, content);

  const categories = document.createElement("div");
  categories.id = "categoriescontainer";
  (post.categories || []).forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "category-post";
    btn.innerText = cat;
    categories.appendChild(btn);
  });

  const actions = document.createElement("div");
  actions.className = "post-actions";
  actions.innerHTML = `
    <div class="action-group">
      <button class="action-btn like" data-action="like">
        <i class="fa-regular fa-thumbs-up intrection"></i>
        <span class="likes-count count">0</span>
      </button>
      <button class="action-btn dislike" data-action="dislike">
        <i class="fa-regular fa-thumbs-down intrection"></i>
        <span class="dislikes-count count">0</span>
      </button>
      <button class="action-btn comment" data-action="comment">
        <i class="fa-regular fa-comment intrection"></i>
        <span class="comments-count count">0</span>
      </button>
    </div>
    <button class="action-btn save" data-action="save">
      <i class="fa-regular fa-bookmark intrection"></i>
      <span class="saves-count count">0</span>
    </button>
  `;

  postDiv.append(postBody, categories, actions);
  return postDiv;
}

export function renderPostList(posts) {
  const container = document.getElementById("posts-container");
  container.classList.add("posts-grid")
  container.innerHTML = "";
  if (!posts)return
  
  posts.forEach((post) => container.appendChild(buildPostCard(post)));
}

export function prependPostCard(post) {
  const container = document.getElementById("posts-container");
  container.prepend(buildPostCard(post));
}

//  Reaction UI 

export function toggleReactionActive(postId, type) {
  const postCard = document.querySelector(
    `.post-card[data-post-id="${postId}"]`
  );
  if (!postCard) return null;

  const btn = postCard.querySelector(
    `.action-btn[data-action="${type}"]`
  );
  if (!btn) return null;

  const wasActive = btn.classList.contains("active-action");

  let oppositeWasActive = false;

  if (type === "like" || type === "dislike") {
    const oppositeType = type === "like" ? "dislike" : "like";
    const oppositeBtn = postCard.querySelector(
      `.action-btn[data-action="${oppositeType}"]`
    );

    if (oppositeBtn) {
      oppositeWasActive =
        oppositeBtn.classList.contains("active-action");

      oppositeBtn.classList.remove("active-action");
    }
  }

  btn.classList.toggle("active-action");

  return { wasActive, oppositeWasActive };
}

export function removeReactionActive(postId,type) {
  const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
  if (!postCard) return;
  const btn = postCard.querySelector(`.action-btn[data-action="${type}"]`);
  if (btn) btn.classList.remove("active-action");
}
export function updateReactionCounts(postId,wasActive,oppositeWasActive,type) {
  const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
  if (!postCard) return;

  const change = wasActive ? -1 : +1;

  if (type === "like") {
    const likeCount = postCard.querySelector(".likes-count");
    likeCount.textContent =
      parseInt(likeCount.textContent) + change;

    if (!wasActive && oppositeWasActive) {
      const dislikeCount =
        postCard.querySelector(".dislikes-count");
      dislikeCount.textContent =
        parseInt(dislikeCount.textContent) - 1;
    }
  }

  if (type === "dislike") {
    const dislikeCount =
      postCard.querySelector(".dislikes-count");
    dislikeCount.textContent =
      parseInt(dislikeCount.textContent) + change;

    if (!wasActive && oppositeWasActive) {
      const likeCount =
        postCard.querySelector(".likes-count");
      likeCount.textContent =
        parseInt(likeCount.textContent) - 1;
    }
  }

  if (type === "save") {
    const saveCount =
      postCard.querySelector(".saves-count");
    saveCount.textContent =
      parseInt(saveCount.textContent) + change;
  }
}

export function updateAllReactionCounts(postId, counts) {
  const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
  if (!postCard) return;
const likeBtn = postCard.querySelector('.action-btn[data-action="like"]');
const dislikeBtn = postCard.querySelector('.action-btn[data-action="dislike"]');
const saveBtn = postCard.querySelector('.action-btn[data-action="save"]'); 
  postCard.querySelector(".likes-count").textContent = counts.likes ?? 0;
  postCard.querySelector(".dislikes-count").textContent = counts.dislikes ?? 0;
  postCard.querySelector(".saves-count").textContent = counts.saves ?? 0;

  if (counts.isliked)likeBtn.classList.add("active-action")
  if (counts.isdisliked)dislikeBtn.classList.add("active-action")
   if (counts.issaved)saveBtn.classList.add("active-action")
}

//action-btn
