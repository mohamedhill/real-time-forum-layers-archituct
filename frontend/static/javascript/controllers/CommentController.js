import * as CommentModel from "../models/CommentModel.js";
import * as HomeView from "../views/HomeView.js";

// Toggle comment section visibility
export function toggleCommentSection(postId) {
  const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
  if (!postCard) return;

  let commentSection = postCard.querySelector(".comment-section");
  
  if (commentSection) {
    commentSection.classList.toggle("show");
  } else {
    commentSection = HomeView.buildCommentSection(postId);
    commentSection.classList.add("show");
    postCard.appendChild(commentSection);
    loadCommentsForPost(postId);
  }
}

// Load all comments for a post
export async function loadCommentsForPost(postId) {
  try {
    const comments = await CommentModel.fetchComments(postId);
    HomeView.renderComments(postId, comments);
  } catch (err) {
    console.error("Error loading comments:", err);
  }
}

// Handle adding a new comment
export async function handleAddComment(postId) {
  const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
  if (!postCard) return;

  const commentInput = postCard.querySelector(".comment-input");
  const content = commentInput.value.trim();

  if (!content) {
    alert("Please enter a comment");
    return;
  }

  try {
    const { ok, data } = await CommentModel.createComment({
      postID: parseInt(postId, 10),
      content: content,
    });

    if (ok) {
      commentInput.value = "";
   
      HomeView.addCommentToList(postId, data);
      updateCommentCount(postId);
    }
  } catch (err) {
    console.error("Error adding comment:", err);
    alert(err.message || "Error adding comment");
  }
}

// Update the comment count display
export async function updateCommentCount(postId) {
  try {
    const count = await CommentModel.getCommentCount(postId);
    const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    if (postCard) {
      const countSpan = postCard.querySelector(".comments-count");
      if (countSpan) {
        countSpan.textContent = count;
      }
    }
  } catch (err) {
    console.error("Error updating comment count:", err);
  }
}

// Delete a comment
export async function handleDeleteComment(postId, commentId) {
  if (!confirm("Are you sure you want to delete this comment?")) {
    return;
  }

  try {
    const { ok } = await CommentModel.deleteComment(commentId);
    if (ok) {
      HomeView.removeComment(postId, commentId);
      updateCommentCount(postId);
    }
  } catch (err) {
    console.error("Error deleting comment:", err);
    alert(err.message || "Error deleting comment");
  }
}

// Load initial comment counts for all posts
export async function loadCommentCountsForAllPosts() {
  const postCards = document.querySelectorAll(".post-card");
  postCards.forEach((card) => {
    const postId = card.dataset.postId;
    loadCommentCountForPost(postId);
  });
}

// Load comment count for a single post
export async function loadCommentCountForPost(postId) {
  try {
    const count = await CommentModel.getCommentCount(postId);
    const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    if (postCard) {
      const countSpan = postCard.querySelector(".comments-count");
      if (countSpan) {
        countSpan.textContent = count;
      }
    }
  } catch (err) {
    console.error("Error loading comment count:", err);
  }
}
