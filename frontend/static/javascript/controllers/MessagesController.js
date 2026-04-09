import * as navigate from "../navigation/Navigation.js"
import * as HomeView from "../views/HomeView.js"

let socket = null
let selectedUser = null
let pendingSelectedUserId = null
const unreadUserIds = new Set()
let notificationCloserBound = false

const state = {
  currentUserId: null,
  users: [],
  messages: new Map(),
  historyMeta: new Map(),
}

export function initializeOnlineUsers() {
  updateNotificationState()
  bindNotificationEvents()
  connectMessagesSocket()
}

export function disconnectMessagesSocket() {
  if (!socket) return
  socket.close()
  socket = null
}

export function resetMessagesViewState() {
  const rightSidebar = HomeView.restoreRightSidebar()
  if (rightSidebar) {
    rightSidebar.classList.remove("visible", "chat-fullscreen")
  }

  selectedUser = null
  pendingSelectedUserId = null
}

export function ShowMessagesPage(url = new URL(window.location.href)) {
  const rightSidebar = document.getElementsByClassName("right-sidebar")[0]
  if (!rightSidebar) {
    window.location.href = "/"
    return
  }

  pendingSelectedUserId = parseUserId(url.searchParams.get("user"))

  rightSidebar.classList.add("visible")
  navigate.setActiveNav("/messages")
  rightSidebar.innerHTML = messageLayout()
  HomeView.applyTheme(localStorage.getItem("theme") || "light")

  bindStaticEvents()
  renderUsers()
  ensureSelectedUser()
  bindNotificationEvents()
  
  if (selectedUser) enterConversationView()
  clearUnreadMessages()
  connectMessagesSocket()
}

function bindStaticEvents() {
  const sendBtn = document.getElementById("sendMessageBtn")
  const input = document.getElementById("messageInput")
  const messagesBox = document.getElementById("chatMessages")
  const backBtn = document.getElementById("chatBackBtn")

  sendBtn?.addEventListener("click", sendMessage)
  input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault()
      sendMessage()
    }
  })

  backBtn?.addEventListener("click", (e) => {
    e.preventDefault()
    exitConversationView()
  })

  const maybeLoadOlderMessages = debounce(() => {
    if (!selectedUser || messagesBox.scrollTop > 16) return
    loadConversationHistory(selectedUser.id)
  }, 80)

  messagesBox?.addEventListener("scroll", throttle(() => {
    maybeLoadOlderMessages()
  }, 200))
}

function connectMessagesSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "users" }))
    return
  }
  if (socket && socket.readyState === WebSocket.CONNECTING) {
    return
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  socket = new WebSocket(`${protocol}//${window.location.host}/ws/messages`)
  
  socket.addEventListener("open", () => {
    setConnectionState("Connected")
    socket.send(JSON.stringify({ type: "users" }))
  })

  socket.addEventListener("message", (event) => {
    const payload = JSON.parse(event.data)
    
    if (payload.type === "users") {
      state.currentUserId = parseUserId(payload.data?.currentUserId) ?? state.currentUserId
      state.users = (payload.data?.users || []).map(normalizeUser).filter(Boolean)
      renderUsers()
      if (document.getElementById("chatList")) ensureSelectedUser()
      return
    }

    if (payload.type === "online" || payload.type === "offline") {
      const id = parseUserId(payload.userId || payload.data?.userId || payload.id)
      const isOnline = payload.type === "online"
      const existing = state.users.find(u => u.id === id)
      if (existing) {
        existing.online = isOnline
      } else if (isOnline) {
        state.users.push({ id, nickname: payload.nickname || `User ${id}`, online: true })
      }
      renderUsers()
      return
    }

    if (payload.type === "message") {
      const message = normalizeMessage(payload.data || payload)
      if (!message) return
      // If a user signs up after we got the initial users snapshot, we may receive a message
      // from an unknown id (e.g. incognito tab). Add a minimal user entry so notifications
      // can still display the sender nickname.
      if (message.from != null && message.from !== state.currentUserId) {
        const exists = state.users.some((u) => u.id === message.from)
        if (!exists) {
          state.users.push({
            id: message.from,
            nickname: message.senderNickname || `User ${message.from}`,
            online: false,
          })
        }
      }
      storeMessage(message)
      if (message.from !== state.currentUserId && !isConversationOpen(message.from)) {
        unreadUserIds.add(message.from)
      }
      renderUsers()
      if (message.from === selectedUser?.id || message.to === selectedUser?.id) {
        renderMessages()
      }
      updateNotificationState()
      return
    }

    if (payload.type === "history") {
      const partnerId = parseUserId(payload.data?.userId)
      if (partnerId == null) return
      const offset = Number(payload.data?.offset) || 0
      const messages = (payload.data?.items || []).map(normalizeMessage).filter(Boolean)
      mergeHistoryPage(partnerId, messages, Boolean(payload.data?.hasMore))
      renderUsers()
      if (selectedUser?.id === partnerId) {
        renderMessages({ preserveScroll: offset > 0, prependCount: messages.length })
      }
      return
    }
  })

  socket.addEventListener("close", () => {
    setConnectionState("Disconnected")
    socket = null
  })
}

function renderUsers() {
  const chatUsers = getSortedChatUsers()
  renderChatUsers(chatUsers)
  renderSidebarUsers(chatUsers)
}

function renderChatListItem(user) {
  const history = ensureConversationState(user.id).items
  const lastMessage = history[history.length - 1]
  const preview = lastMessage?.text || user.lastMessageText || "Start a conversation"
  const activeClass = selectedUser?.id === user.id ? " chat-item-active" : ""
  const hasUnread = unreadUserIds.has(user.id) ? " unread-indicator" : ""

  return `
    <div class="chat-item${activeClass}" data-user-id="${user.id}">
      <div class="chat-avatar">
        <div class="avatar-placeholder">${escapeHtml(firstLetter(user.nickname))}</div>
        ${user.online ? '<div class="online-dot"></div>' : ""}
      </div>
      <div class="chat-info">
        <div class="chat-name">${escapeHtml(user.nickname)}</div>
        <div class="chat-preview">${escapeHtml(preview)}</div>
      </div>
      ${hasUnread ? '<div class="unread-badge"></div>' : ""}
    </div>
  `
}

function renderChatUsers(chatUsers) {
  const chatList = document.getElementById("chatList")
  if (!chatList) return

  chatList.innerHTML = chatUsers.length
    ? chatUsers.map(renderChatListItem).join("")
    : `<div class="chat-empty">No users found.</div>`

  bindUserSelection(chatList, chatUsers, { enterChat: true })
}

function renderSidebarUsers(users) {
  const sidebarList = document.getElementById("sidebarOnlineList")
  if (!sidebarList) return

  const sidebarUsers = [...users].sort((a, b) => a.nickname.localeCompare(b.nickname))
  sidebarList.innerHTML = sidebarUsers.length
    ? sidebarUsers.map(renderSidebarUserItem).join("")
    : `<div class="chat-empty-mini">No users found.</div>`

  bindUserSelection(sidebarList, sidebarUsers, { enterChat: false })
}

function renderSidebarUserItem(user) {
  return `
    <div class="pinned-item" data-user-id="${user.id}">
      <div class="pinned-avatar">
        <div class="avatar-placeholder">${escapeHtml(firstLetter(user.nickname))}</div>
        ${user.online ? '<div class="online-dot"></div>' : ""}
      </div>
      <div class="pinned-name-row">
        <div class="pinned-name">${escapeHtml(user.nickname)}</div>
        ${user.online ? '<span class="pinned-status-dot" aria-label="Online"></span>' : ""}
      </div>
    </div>
  `
}

function bindUserSelection(container, users, { enterChat }) {
  container.querySelectorAll("[data-user-id]").forEach((node) => {
    node.addEventListener("click", () => {
      const user = users.find((item) => item.id === Number(node.dataset.userId))
      if (!user) return
      selectedUser = user
      pendingSelectedUserId = null
      clearUnreadMessages(user.id)
      updateSelectedHeader()
      renderUsers()
      renderMessages()
      loadConversationHistory(user.id)
      if (enterChat) enterConversationView()
      else navigation.navigate(`/messages?user=${user.id}`)
    })
  })
}

function renderMessages({ preserveScroll = false, prependCount = 0 } = {}) {
  const messagesBox = document.getElementById("chatMessages")
  if (!messagesBox) return
  
  const previousHeight = messagesBox.scrollHeight
  const previousTop = messagesBox.scrollTop

  if (!selectedUser) {
    messagesBox.innerHTML = `<div class="chat-empty">Choose a user to start chatting.</div>`
    return
  }

  const history = ensureConversationState(selectedUser.id).items
  const currentId = state.currentUserId

  if (!history.length) {
    messagesBox.innerHTML = `<div class="chat-empty">No messages yet, say hi.</div>`
    return
  }

  messagesBox.innerHTML = history.map((message) => {
    const own = message.from === currentId
    const author = own
      ? (message.senderNickname || window.currentUser || "You")
      : (message.senderNickname || selectedUser?.nickname || `User ${message.from}`)
    return `
      <div class="message-row ${own ? "mine" : "theirs"}">
        <div class="message-bubble">
          <div class="message-author">${escapeHtml(author)}</div>
          <div class="message-text">${escapeHtml(message.text)}</div>
          <div class="message-time">${escapeHtml(formatTime(message.timestamp))}</div>
        </div>
      </div>
    `
  }).join("")

  if (preserveScroll && prependCount > 0) {
    messagesBox.scrollTop = messagesBox.scrollHeight - previousHeight + previousTop
  } else {
    messagesBox.scrollTop = messagesBox.scrollHeight
  }
}

function sendMessage() {
  const input = document.getElementById("messageInput")
  if (!input || !selectedUser || !socket || socket.readyState !== WebSocket.OPEN) return
  const text = input.value.trim()
  if (!text) return
  socket.send(JSON.stringify({
    type: "message",
    receiver: selectedUser.id,
    message: text,
  }))
  input.value = ""
}

function enterConversationView() {
  const phone = document.querySelector('.phone')
  const sidebar = document.querySelector('.messages-sidebar-panel')
  const chatPanel = document.querySelector('.messages-chat-panel')
  const backBtn = document.getElementById('chatBackBtn')
  if (phone) phone.classList.add('chat-open')
  if (sidebar) sidebar.style.display = 'none'
  if (chatPanel) chatPanel.style.display = 'flex'
  if (backBtn) backBtn.style.display = 'inline-block'
  const rightSidebar = document.getElementsByClassName('right-sidebar')[0]
  if (rightSidebar) rightSidebar.classList.add('chat-fullscreen')
}

function exitConversationView() {
  const phone = document.querySelector('.phone')
  const sidebar = document.querySelector('.messages-sidebar-panel')
  const chatPanel = document.querySelector('.messages-chat-panel')
  const backBtn = document.getElementById('chatBackBtn')
  if (phone) phone.classList.remove('chat-open')
  if (sidebar) sidebar.style.display = ''
  if (chatPanel) chatPanel.style.display = 'none'
  if (backBtn) backBtn.style.display = 'none'
  const rightSidebar = document.getElementsByClassName('right-sidebar')[0]
  if (rightSidebar) rightSidebar.classList.remove('chat-fullscreen')
  selectedUser = null
  renderUsers()
}

function messageLayout() {
  return `
    <div class="phone">
      <div class="messages-layout">
        <aside class="messages-sidebar-panel">
          <div class="sidebar-header">
            <h2>Messages</h2>
 
          </div>
          <div class="chat-list" id="chatList"></div>
        </aside>

        <main class="messages-chat-panel" style="display:none">
          <header class="messages-chat-header">
            <div class="header-left">
              <button id="chatBackBtn" class="chat-back-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <div class="user-info">
                <div class="chat-name" id="chattingWith">Select a user</div>
                <div class="chat-status" id="chattingStatus"></div>
              </div>
            </div>
          </header>

          <div class="messages-box" id="chatMessages">
            <div class="chat-empty">Choose a user to start chatting.</div>
          </div>

          <footer class="message-composer">
            <div class="input-wrapper">
              <input id="messageInput" class="message-input" type="text" placeholder="Type a message..." disabled>
            <button id="sendMessageBtn" class="send-message-btn">
  <i class="fa-solid fa-paper-plane"></i>
</button>
            </div>
          </footer>
        </main>
      </div>
    </div>
  `
}

/* Helper Functions */
function ensureSelectedUser() {
  const chatUsers = getSortedChatUsers()
  if (pendingSelectedUserId != null) {
    selectedUser = chatUsers.find((user) => user.id === pendingSelectedUserId) || selectedUser
    if (selectedUser?.id === pendingSelectedUserId) pendingSelectedUserId = null
  }
  if (selectedUser) clearUnreadMessages(selectedUser.id)
  updateSelectedHeader()
  renderMessages()
}

function updateSelectedHeader() {
  const nameNode = document.getElementById("chattingWith")
  const statusNode = document.getElementById("chattingStatus")
  const input = document.getElementById("messageInput")
  if (!nameNode || !statusNode || !input) return

  if (!selectedUser) {
    nameNode.textContent = "Select a user"; statusNode.textContent = ""; input.disabled = true; return
  }
  nameNode.textContent = selectedUser.nickname
  statusNode.textContent = selectedUser.online ? "Online" : "Offline"
  input.disabled = false
}

function storeMessage(message) {
  const partnerId = message.from === state.currentUserId ? message.to : message.from
  const conversation = ensureConversationState(partnerId)
  if (!conversation.items.some((item) => item.id === message.id)) {
    conversation.items.push(message)
  }
  conversation.loaded = true
  conversation.offset = conversation.items.length
  state.messages.set(partnerId, conversation.items)
}

function ensureConversationState(userId) {
  if (!state.historyMeta.has(userId)) {
    state.historyMeta.set(userId, { loaded: false, loading: false, hasMore: true, offset: 0, items: [] })
  }
  return state.historyMeta.get(userId)
}

function loadConversationHistory(userId) {
  const conversation = ensureConversationState(userId)
  if (conversation.loading || (!conversation.hasMore && conversation.loaded)) return
  if (!socket || socket.readyState !== WebSocket.OPEN) return
  conversation.loading = true
  socket.send(JSON.stringify({ type: "history", receiver: userId, offset: conversation.offset, limit: 15 }))
}

function mergeHistoryPage(userId, messages, hasMore) {
  const conversation = ensureConversationState(userId)
  const existingIds = new Set(conversation.items.map(m => m.id))
  const newMsgs = messages.filter(m => !existingIds.has(m.id))
  conversation.items = [...newMsgs, ...conversation.items]
  conversation.loading = false; conversation.hasMore = hasMore; conversation.offset = conversation.items.length
}

function getSortedChatUsers() {
  return [...state.users.filter(u => u.id !== state.currentUserId)].sort((a, b) => {
    const tA = ensureConversationState(a.id).items.slice(-1)[0]?.timestamp || 0
    const tB = ensureConversationState(b.id).items.slice(-1)[0]?.timestamp || 0
    return new Date(tB) - new Date(tA)
  })
}

function setConnectionState(text) {
  const node = document.getElementById("chatConnectionState")
  if (node) node.textContent = text
}

function firstLetter(v = "?") { return v.charAt(0).toUpperCase() }
function formatTime(v) { return v ? new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "" }
function formatDateTime(v) {
  if (!v) return ""
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString([], { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
}
function parseUserId(v) { const id = Number(v); return Number.isInteger(id) && id > 0 ? id : null }
function isConversationOpen(id) { return selectedUser?.id === id }

function clearUnreadMessages(id = null) {
  if (id) unreadUserIds.delete(id); else unreadUserIds.clear()
  updateNotificationState()
}

function updateNotificationState() {
  const btn = document.getElementById("notificationBtn")
  if (btn) btn.classList.toggle("has-unread", unreadUserIds.size > 0)
  renderNotificationPanel()
}

function normalizeUser(u) {
  const id = parseUserId(u?.id); if (!id) return null
  return { ...u, id, nickname: u.nickname || `User ${id}`, online: !!u.online }
}

function normalizeMessage(m) {
  const from = parseUserId(m?.from), to = parseUserId(m?.to)
  if (!from || !to) return null
  return { ...m, from, to, timestamp: m.timestamp || m.time }
}

function throttle(cb, d) {
  let last = 0; return (...args) => { const now = Date.now(); if (now - last >= d) { last = now; cb(...args) } }
}

function debounce(cb, d) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => cb(...args), d) }
}

function escapeHtml(v = "") {
  return String(v).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[s]))
}

function bindNotificationEvents() {
  const wrapper = document.getElementById("notificationWrapper")
  const btn = document.getElementById("notificationBtn")
  const panel = document.getElementById("notificationPanel")
  if (!wrapper || !btn || !panel) return

  if (wrapper.dataset.notificationBound === "true") {
    renderNotificationPanel()
    return
  }
  wrapper.dataset.notificationBound = "true"

  wrapper.addEventListener("click", (e) => e.stopPropagation())

  btn.addEventListener("click", (e) => {
    e.preventDefault()
    e.stopPropagation()
    wrapper.classList.toggle("is-open")
    if (wrapper.classList.contains("is-open")) {
      renderNotificationPanel()
    }
  })

  if (!notificationCloserBound) {
    notificationCloserBound = true
    document.addEventListener("click", () => {
      const w = document.getElementById("notificationWrapper")
      if (w?.classList.contains("is-open")) w.classList.remove("is-open")
    })
  }

  renderNotificationPanel()
}

function renderNotificationPanel() {
  const panel = document.getElementById("notificationPanel")
  if (!panel) return

  panel.innerHTML = renderNotificationItems()

  panel.querySelectorAll(".notification-item[data-user-id]").forEach((node) => {
    node.addEventListener("click", () => {
      const userId = parseUserId(node.dataset.userId)
      if (!userId) return

      const wrapper = document.getElementById("notificationWrapper")
      if (wrapper) wrapper.classList.remove("is-open")

      clearUnreadMessages(userId)

      const path = `/messages?user=${userId}`
      if (window.navigation?.navigate) window.navigation.navigate(path)
      else window.location.href = path
    })
  })
}

function renderNotificationItems() {
  const unread = [...unreadUserIds]
  if (!unread.length) return `<div class="notification-empty">No new messages.</div>`

  const items = unread
    .map((id) => {
      const user = state.users.find((u) => u.id === id) || { id, nickname: `User ${id}` }

      return `
        <button class="notification-item" type="button" data-user-id="${id}">
          <div class="notification-item-text">You got a new message from "${escapeHtml(user.nickname)}"</div>
        </button>
      `
    })
    .join("")

  return items
}
