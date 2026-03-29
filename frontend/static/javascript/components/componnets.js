export const sidebar = `
      <div class="logo">


      <a draggable="false" href="/">
      
      <img draggable="false" id="homelogo" class="homelogo" src="static/img/logo-remove.png" alt="">
      
      </a>

      </div>
    <nav class="nav">
  <button class="nav-item active"data-route="/">
    <i class="ri-home-5-line"></i>
    <span>Home</span>
  </button>

  <button class="nav-item" data-route="/saved">
   <i class="ri-bookmark-line"></i>
  <span>Saved Posts</span>
  </button>


  <button class="nav-item messagesBtn" id="rightmsg" data-route="/messages">
    <i class="ri-message-3-line"></i>
    <span>Messages</span>
  </button>

  <button class="nav-item" data-route="/likedpost">
    <i class="ri-heart-3-line"></i>
    <span>Liked Posts</span>
  </button>
</nav>

<div class="online-users-section">
  <div class="section-header">
    <div class="section-title">
      <span class="live-dot"></span>
      Online Users
    </div>
  </div>
  <div class="online-users-wrapper no-scroll-buttons">
    <div class="pinned-list" id="sidebarOnlineList"></div>
  </div>
</div>

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
 
 <div class="notification-wrapper" id="notificationWrapper">
   <button class="notification-header-btn" id="notificationBtn" type="button" aria-label="Notifications">
      <i class="ri-notification-3-line"></i>
      <span class="notification-dot"></span>
   </button>
   <div class="notification-panel" id="notificationPanel"></div>
 </div>

 <div class="custom-profile-wrapper" id="customProfileWrapper">
  <div class="custom-avatar-trigger" id="nicknameuser">A</div>

  <div class="custom-dropdown-content">
    <button id="showloginbtn" class="custom-logout-action">
      <i class="ri-logout-box-r-line"></i>
      <span>Logout</span>
    </button>
  </div>
</div>
      
      

              
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



export const mobilenav = `
  <nav class="nav-bar-bottum" >
  <button class="nav-bottum " data-route="/"">
    <i class="ri-home-5-line"></i>
    <span>Home</span>
  </button>

<button class="nav-bottum" data-route="/saved">
  <i class="ri-bookmark-line"></i>
  <span>Saved Posts</span>
</button>
  <button class="nav-bottum" data-route="/notify">
    <i class="ri-notification-3-line"></i>
    <span>Notifications</span>
  </button>

  <button class="nav-bottum messagesBtn" id="buttommsg" data-route="/messages">
    <i class="ri-message-3-line"></i>
    <span>Messages</span>
  </button>

  <button class="nav-bottum" data-route="/likedpost">
    <i class="ri-heart-3-line"></i>
    <span>Liked Posts</span>
  </button>
</nav>
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
    export const errorpage = `
        <div class="error-container">
          <div class="error-content">
            <h1 class="error-code">404</h1>
            <div class="error-icon">
              <i class="ri-map-pin-user-line"></i>
            </div>
            <h2>Oops! You're lost in space.</h2>
            <p>The page you are looking for doesn't exist or has been moved.</p>
            <a href="/" class="back-home-btn">
              <i class="ri-home-5-line"></i> Back to Home
            </a>
          </div>
        </div>
      `



      export const chatstatic = `<div class="phone">


  <div class="content-chat">

    <!-- Search -->
    <div class="search-bar-chat">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <span>Search ...</span>
    </div>

    <!-- Online Users -->
    <div class="section-header">
      <div class="section-title">
        <span class="live-dot"></span>
        Online Users
      </div>
    </div>

    <div class="online-users-wrapper">
      <button class="scroll-btn" id="scrollLeft">&#8249;</button>
      <div class="pinned-list" id="onlineList">
        <div class="pinned-item">
          <div class="pinned-avatar">
            <div class="avatar-placeholder">A</div>
            <div class="online-dot"></div>
          </div>
          <span class="pinned-name">Ahmad</span>
        </div>
        <div class="pinned-item">
          <div class="pinned-avatar">
            <div class="avatar-placeholder">Z</div>
            <div class="online-dot"></div>
          </div>
          <span class="pinned-name">Zain</span>
        </div>
      </div>
      <button class="scroll-btn" id="scrollRight">&#8250;</button>
    </div>

    <!-- Chat List -->

    

    <div class="chat-list">

      <div class="chat-item">
        <div class="chat-avatar">
          <div class="avatar-placeholder" ;">R</div>
          <div class="status"></div>
        </div>
        <div class="chat-info">
          <div class="chat-name">Rader Miler</div>
          <div class="chat-preview">Oh.. thank you so much..</div>
        </div>
        <div class="chat-meta">
          <span class="chat-time">07:00 AM</span>
        </div>
      </div>

      <div class="chat-item">
        <div class="chat-avatar">
          <div class="avatar-placeholder";">M</div>
          <div class="status"></div>
        </div>
        <div class="chat-info">
          <div class="chat-name">Mitdhal Marse</div>
          <div class="chat-preview">Hi, Good Afternoon</div>
        </div>
        <div class="chat-meta">
          <span class="chat-time">06:00 PM</span>
          <div class="badge">2</div>
        </div>
      </div>


    </div>
  </div>
</div>`
