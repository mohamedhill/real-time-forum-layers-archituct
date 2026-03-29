import * as PostModel from "../models/PostModel.js";
import * as HomeView from "../views/HomeView.js";
import * as ReactionController from "./ReactionController.js";
import * as CommentController from "./CommentController.js";

//  Load Posts 

export async function loadPosts() {
  const posts = await PostModel.fetchPosts();
  if (!posts)return
  HomeView.renderPostList(posts);

  // Fetch reaction counts for each rendered post card
  document.querySelectorAll(".post-card").forEach((card) => {
    ReactionController.loadCountsForPost(card.dataset.postId);
  });
  
  // Load comment counts and setup comment listeners
  setupCommentListeners();
  CommentController.loadCommentCountsForAllPosts();
}

export async function loadlikedposts() {
  const posts = await PostModel.getLikedPosts();

  HomeView.renderPostList(posts)

    document.querySelectorAll(".post-card").forEach((card) => {
    ReactionController.loadCountsForPost(card.dataset.postId);
  });
  
  // Load comment counts and setup comment listeners
  setupCommentListeners();
  CommentController.loadCommentCountsForAllPosts();
}




export async function loadsavedposts() {
  const posts = await PostModel.getSavedPosts();
  HomeView.renderPostList(posts)

    document.querySelectorAll(".post-card").forEach((card) => {
    ReactionController.loadCountsForPost(card.dataset.postId);
  });
  
  // Load comment counts and setup comment listeners
  setupCommentListeners();
  CommentController.loadCommentCountsForAllPosts();
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
    alert("Error creating post:", err);
  }
}

// Setup comment event listeners for all post cards
function setupCommentListeners() {
  document.querySelectorAll(".post-card").forEach((card) => {
    
    
    
    const commentBtn = card.querySelector('.action-btn[data-action="comment"]');
    if (commentBtn) {
      commentBtn.removeEventListener("click", handleCommentBtnClick);
      commentBtn.addEventListener("click", handleCommentBtnClick);
    }
  });
}

function  handleCommentBtnClick(event) {
  const postCard = event.target.closest(".post-card");
  if (!postCard) return;
  
  const postId = postCard.dataset.postId;
  CommentController.toggleCommentSection(postId);
}

// Add event listener delegation for dynamically created comment submit buttons
export function setupCommentFormListeners() {
  document.addEventListener("click", (event) => {
    if (event.target.classList.contains("comment-submit-btn")) {
      handleCommentSubmit(event);
    }
    
    if (event.target.classList.contains("delete-comment-btn") || event.target.closest(".delete-comment-btn")) {
      handleDeleteCommentClick(event);
    }
  });
}

function handleCommentSubmit(event) {
  const postCard = event.target.closest(".post-card");
  if (!postCard) return;
  
  const postId = postCard.dataset.postId;
  CommentController.handleAddComment(postId);
}

function handleDeleteCommentClick(event) {
  const commentItem = event.target.closest(".comment-item");
  if (!commentItem) return;
  
  const postCard = event.target.closest(".post-card");
  if (!postCard) return;
  
  const postId = postCard.dataset.postId;
  const commentId = commentItem.dataset.commentId;
  
  CommentController.handleDeleteComment(postId, commentId);
}
