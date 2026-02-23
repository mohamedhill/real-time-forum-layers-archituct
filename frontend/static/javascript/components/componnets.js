export const sidebar = `
      <div class="logo">


      <a draggable="false" href="/">
      
      <img draggable="false" id="homelogo" class="homelogo" src="static/img/logo.png" alt="">
      
      </a>

      </div>
    <nav class="nav">
  <button class="nav-item active">
    <i class="ri-home-5-line"></i>
    <span>Home</span>
  </button>

  <button class="nav-item">
    <i class="ri-compass-3-line"></i>
    <span>Explore</span>
  </button>

  <button class="nav-item">
    <i class="ri-notification-3-line"></i>
    <span>Notifications</span>
  </button>

  <button class="nav-item" id="messagesBtn">
    <i class="ri-message-3-line"></i>
    <span>Messages</span>
  </button>

  <button class="nav-item">
    <i class="ri-heart-3-line"></i>
    <span>Liked Posts</span>
  </button>
</nav>

<button id="creat-post-btn" class="create-post-btn">
  <i class="ri-add-circle-line"></i>
  <span>Create Post</span>
</button>

    `



export const mainContent = `
      <div class="header">
      <span class="theme">
      <i data-theme="light"  id="light" class="icon fas fa-sun"></i>
      <i data-theme="dark" id="dark" class="active icon fas fa-moon"></i>

  </span>

  <div class="search-bar">
<i class="ri-search-line"></i>
<input type="text" class="search-input" placeholder="Search">
</div>
  <button id="showloginbtn" class="showloginbtn">
    <i class="ri-logout-box-r-line"></i>
    <span>Logout</span>
  </button>


      
      

              
        </div>
      </div>

      <div class="content">
        <div class="card">
          <h2 class="card-title">Create Post</h2>
         <button id="writesomething" class="post-trigger-btn">
        Write something...
    </button>
        

      

    
        
          
        </div>
      <div id="posts-container" class="posts-grid-layout posts-grid" ></div>
      </div>
    `

   export const rightSidebar = `
          <div class="sidebar-section">
            <h3 class="sidebar-title">Messages</h3>
            <div id="requests"></div>
          </div>
        `


        export let creatpostdiv = `<div class="modal-overlay">
        <div class="modal">
            <div class="modal-header">
                <h2 class="modal-title">Create Post</h2>
              <button id="close-btn"  class="close-btn">
    <i class="fas fa-xmark"></i>
</button>

            </div>

            <form id="postForm">
                <div class="form-group">
                    <label class="form-label">Post Title</label>
                    <input id="post-title" type="text" class="form-input" placeholder="Post Title" required>
                </div>

                <div class="form-group">
                    <label class="form-label">Post Content</label>
                    <textarea id="post-content" class="form-input form-textarea" placeholder="Write something..." required></textarea>
                </div>

                <div class="category-section">
                    <label class="form-label">Select Category</label>
                    <div class="category-grid">
                      <button type="button" class="category-btn" data-category-name="Technology">Technology</button>
                      <button type="button" class="category-btn" data-category-name="Lifestyle">Lifestyle</button>
                      <button type="button" class="category-btn" data-category-name="Gaming">Gaming</button>
                      <button type="button" class="category-btn" data-category-name="Sports">Sports</button>
                      <button type="button" class="category-btn" data-category-name="Music">Music</button>
                      <button type="button" class="category-btn" data-category-name="Movies">Movies</button>
                      <button type="button" class="category-btn" data-category-name="Food">Food</button>
                      <button type="button" class="category-btn" data-category-name="Travel">Travel</button>
                      <button type="button" class="category-btn" data-category-name="Other">Other</button>
                    </div>
                </div>

                <button type="submit" class="publish-btn">Publish Post</button>
            </form>
        </div>
    </div>`;



    