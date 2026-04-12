import * as PostModel from "../models/PostModel.js";
import * as HomeView from "../views/HomeView.js";
import * as ReactionController from "./ReactionController.js";
import * as CommentController from "./CommentController.js";

const POSTS_PAGE_SIZE = 1000

//  Load Posts 

export async function loadPosts() {
  const posts = await PostModel.fetchPosts({
    limit: POSTS_PAGE_SIZE,
  })

  if (!posts?.length) {
    HomeView.renderEmptyPosts("No posts yet")
    return
  }

  HomeView.renderPostList(posts)
  hydratePostInteractions(posts)
}

export async function loadlikedposts() {
  detachInfiniteScroll()
  const posts = await PostModel.getLikedPosts();
  if (!posts?.length) {
    HomeView.renderEmptyPosts("No liked posts yet");
    return
  }

  HomeView.renderPostList(posts)
  hydratePostInteractions(posts);
}




export async function loadsavedposts() {
  detachInfiniteScroll()
  const posts = await PostModel.getSavedPosts();
  if (!posts?.length) {
    HomeView.renderEmptyPosts("No saved posts yet");
    return
  }

  HomeView.renderPostList(posts)
  hydratePostInteractions(posts);
}

function hydrateRenderedPosts(posts) {
  posts.forEach((post) => {
    ReactionController.loadCountsForPost(post.id)
  })

  CommentController.loadCommentCountsForAllPosts()
}

export function hydratePostInteractions(posts) {
  hydrateRenderedPosts(posts || [])
}

function detachInfiniteScroll() {
  return
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
      ReactionController.loadCountsForPost(data.id)
      CommentController.loadCommentCountsForAllPosts()
      HomeView.hideCreatePostModal();
    }
  } catch (err) {
    alert(err.message || "Error creating post");
  }
}

// Add event listener delegation for dynamically created comment submit buttons
export function setupCommentFormListeners() {
  if (document.body.dataset.commentFormListenersBound === "true") return;
  document.body.dataset.commentFormListenersBound = "true";

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
