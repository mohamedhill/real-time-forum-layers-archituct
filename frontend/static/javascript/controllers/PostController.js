import * as PostModel from "../models/PostModel.js";
import * as HomeView from "../views/HomeView.js";
import * as ReactionController from "./ReactionController.js";
import * as CommentController from "./CommentController.js";

const POSTS_PAGE_SIZE = 10

const postsFeedState = {
  offset: 0,
  loading: false,
  hasMore: true,
  scrollElement: null,
  scrollHandler: null,
}

//  Load Posts 

export async function loadPosts() {
  resetPostsFeed()
  attachInfiniteScroll()
  await loadNextPostsPage({ replace: true })
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

async function loadNextPostsPage({ replace = false } = {}) {
  if (postsFeedState.loading || !postsFeedState.hasMore) return

  postsFeedState.loading = true

  try {
    const posts = await PostModel.fetchPosts({
      limit: POSTS_PAGE_SIZE,
      offset: postsFeedState.offset,
    })

    if (!posts) return

    if (!posts.length) {
      postsFeedState.hasMore = false
      return
    }

    if (replace) HomeView.renderPostList(posts)
    else HomeView.appendPostList(posts)

    hydrateRenderedPosts(posts)

    postsFeedState.offset += posts.length
    postsFeedState.hasMore = hasMorePosts(posts.length)
  } finally {
    postsFeedState.loading = false
  }
}

function hasMorePosts(pageLength) {
  return pageLength === POSTS_PAGE_SIZE
}

function hydrateRenderedPosts(posts) {
  posts.forEach((post) => {
    ReactionController.loadCountsForPost(post.id)
  })

  setupCommentListeners()
  CommentController.loadCommentCountsForAllPosts()
}

export function hydratePostInteractions(posts) {
  hydrateRenderedPosts(posts || [])
}

function resetPostsFeed() {
  postsFeedState.offset = 0
  postsFeedState.loading = false
  postsFeedState.hasMore = true
}

function attachInfiniteScroll() {
  detachInfiniteScroll()

  const content = document.querySelector(".content")
  if (!content) return

  postsFeedState.scrollElement = content
  postsFeedState.scrollHandler = async () => {
    const remaining = content.scrollHeight - content.scrollTop - content.clientHeight
    if (remaining > 180) return
    await loadNextPostsPage()
  }

  content.addEventListener("scroll", postsFeedState.scrollHandler)
}

function detachInfiniteScroll() {
  if (postsFeedState.scrollElement && postsFeedState.scrollHandler) {
    postsFeedState.scrollElement.removeEventListener("scroll", postsFeedState.scrollHandler)
  }

  postsFeedState.scrollElement = null
  postsFeedState.scrollHandler = null
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
      setupCommentListeners()
      CommentController.loadCommentCountsForAllPosts()
      if (postsFeedState.offset > 0) postsFeedState.offset += 1
      HomeView.hideCreatePostModal();
    }
  } catch (err) {
    alert(err.message || "Error creating post");
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
