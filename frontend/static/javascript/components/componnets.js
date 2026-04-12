export const sidebar = `
      <div class="logo">


      <a draggable="false" href="/">
      
      <img draggable="false" id="homelogo" class="homelogo" src="/static/img/logo-remove.png" alt="">
      
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
      Users
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
    <button id="showprofilebtn" class="custom-logout-action">
      <i class="ri-user-3-line"></i>
      <span>Profile</span>
    </button>
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
export function errorpage({
  code = "404",
  title = "Oops! You're lost in space.",
  message = "The page you are looking for doesn't exist or has been moved.",
  icon = "ri-map-pin-user-line",
} = {}) {
  return `
    <div class="error-container">
      <div class="error-content">
        <div class="error-badge">Request Failed</div>
        <h1 class="error-code">${code}</h1>
        <div class="error-icon" aria-hidden="true">
          <i class="${icon}"></i>
        </div>
        <h2>${title}</h2>
        <p>${message}</p>
        <div class="error-actions">
          <a href="/" class="back-home-btn">
            <i class="ri-home-5-line"></i> Back to Home
          </a>
        </div>
      </div>
    </div>
  `
}

export function profileCard(profile) {
  return `
    <section class="profile-shell">
      <div class="profile-hero">
        <div class="profile-avatar-large">${(profile.nickname || "?").charAt(0).toUpperCase()}</div>
        <div class="profile-copy">
          <p class="profile-eyebrow">Profile</p>
          <h2 class="profile-name">${profile.nickname || "Unknown user"}</h2>
          <p class="profile-email">${profile.email || ""}</p>
        </div>
      </div>

      <div class="profile-stats-grid">
        <article class="profile-stat-card">
          <span class="profile-stat-label">Posts</span>
          <strong class="profile-stat-value">${profile.postCount ?? 0}</strong>
        </article>
        <article class="profile-stat-card">
          <span class="profile-stat-label">Liked Posts</span>
          <strong class="profile-stat-value">${profile.likedCount ?? 0}</strong>
        </article>
        <article class="profile-stat-card">
          <span class="profile-stat-label">Saved Posts</span>
          <strong class="profile-stat-value">${profile.savedCount ?? 0}</strong>
        </article>
      </div>

      <section class="profile-posts-panel">
        <div class="profile-posts-header">
          <div>
            <p class="profile-eyebrow">Posts</p>
            <h3 class="profile-posts-title">Your posts</h3>
          </div>
          <span class="profile-posts-count">${profile.posts?.length ?? 0}</span>
        </div>
        <div id="profile-posts-list" class="profile-posts-list"></div>
      </section>
    </section>
  `
}



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
