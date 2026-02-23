import * as PostModel from "../models/PostModel.js";
import * as HomeView from "../views/HomeView.js";
import * as ReactionController from "./ReactionController.js";

//  Load Posts 

export async function loadPosts() {
  const posts = await PostModel.fetchPosts();
  if (!posts)return
  HomeView.renderPostList(posts);

  // Fetch reaction counts for each rendered post card
  document.querySelectorAll(".post-card").forEach((card) => {
    ReactionController.loadCountsForPost(card.dataset.postId);
  });
}

//  Create Post 

export async function handleCreatePost() {
  const form = document.getElementById("postForm");
  const titleInput = document.getElementById("post-title");
  const contentInput = document.getElementById("post-content");

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();

  // Clear inputs immediately for UX
  titleInput.value = "";
  contentInput.value = "";

  const categoryButtons = Array.from(form.querySelectorAll(".category-btn"));
  const selectedCategories = categoryButtons
    .filter((btn) => btn.classList.contains("active"))
    .map((btn) => {
      btn.classList.remove("active");
      return btn.dataset.categoryName;
    });

  try {
    const { ok, data } = await PostModel.createPost({ title, content, categories: selectedCategories });
    
    
    
    if (ok) {
      HomeView.prependPostCard({
        title,
        content,
        nickname: data.nickname,
        categories: selectedCategories,
        time: data.time,
        id: data.id,
      });
      HomeView.hideCreatePostModal();
    }
  } catch (err) {
    console.error("Error creating post:", err);
  }
}
