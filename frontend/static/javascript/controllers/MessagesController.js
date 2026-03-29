import * as navigate from "../navigation/Navigation.js"

let socket = null
let selectedUser = null
let pendingSelectedUserId = null
const unreadUserIds = new Set()

const state = {
  currentUserId: null,
  users: [],
  messages: new Map(),
}

export function initializeOnlineUsers() {
  updateNotificationState()
  connectMessagesSocket()
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

  bindStaticEvents()
  renderUsers()
  ensureSelectedUser()
  clearUnreadMessages()
  connectMessagesSocket()
}

function bindStaticEvents() {
  const sendBtn = document.getElementById("sendMessageBtn")
  const input = document.getElementById("messageInput")

  sendBtn?.addEventListener("click", sendMessage)
  input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault()
      sendMessage()
    }
  })
}
function connectMessagesSocket() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    socket.send(JSON.stringify({ type: "users" }))
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
      const chatList = document.getElementById("chatList")
      if (chatList) {
        ensureSelectedUser()
      }
      return
    }
    if (payload.type === "online") {
      const id = parseUserId(payload.userId || payload.data?.userId || payload.id || payload.data?.id)
      const username = payload.username || payload.data?.username || payload.nickname || payload.data?.nickname
      if (id == null) return
      const existing = state.users.find(u => u.id === id)
      if (existing) {
        existing.online = true
        if (username) existing.nickname = username
      } else {
        state.users.push({ id, nickname: username || `User ${id}`, online: true })
      }
      renderUsers()
      const chatList = document.getElementById("chatList")
      if (chatList) {
        ensureSelectedUser()
      }
      return
    }
    if (payload.type === "offline") {
      const id = parseUserId(payload.userId || payload.data?.userId || payload.id || payload.data?.id)
      if (id == null) return
      const existing = state.users.find(u => u.id === id)
      if (existing) existing.online = false
      renderUsers()
      return
    }
    if (payload.type === "message") {
      const message = normalizeMessage(payload.data || payload)
      if (!message) return
      storeMessage(message)
      if (message.from !== state.currentUserId && !isConversationOpen(message.from)) {
        unreadUserIds.add(message.from)
      }
      renderUsers()
      if (
        message.from === selectedUser?.id ||
        message.to === selectedUser?.id
      ) {
        renderMessages()
      }
      updateNotificationState()
      return
    }
    if (payload.type === "error") {
      setConnectionState(payload.data?.message || "Chat error")
    }
  })
  socket.addEventListener("close", () => {
    setConnectionState("Disconnected")
  })
}
function storeMessage(message) {
  const partnerId = message.from === state.currentUserId ? message.to : message.from
  const existing = state.messages.get(partnerId) || []
  existing.push(message)
  state.messages.set(partnerId, existing)
}

function renderUsers() {
  const sidebarOnlineList = document.getElementById("sidebarOnlineList")
  const chatList = document.getElementById("chatList")
  const chatUsers = getChatUsers()
  
  if (!chatList && !sidebarOnlineList) return
  const onlineUsers = chatUsers.filter((user) => user.online)
  if (sidebarOnlineList) {
    sidebarOnlineList.innerHTML = onlineUsers.length? onlineUsers.map(renderOnlineUserCard).join(""): `<div class="chat-empty-mini">No users online</div>`
  }
  if (chatList) {
    chatList.innerHTML = chatUsers.length? chatUsers.map(renderChatListItem).join(""): `<div class="chat-empty">No other users found yet.</div>`
  }

  document.querySelectorAll("[data-user-id]").forEach((node) => {
    node.addEventListener("click", () => {
      const user = chatUsers.find((item) => item.id === Number(node.dataset.userId))
      if (!user) return
      if (!chatList) {
        navigation.navigate(`/messages?user=${user.id}`)
        return
      }
      selectedUser = user
      pendingSelectedUserId = null
      clearUnreadMessages(user.id)
      updateSelectedHeader()
      renderUsers()
      renderMessages()
    })
  })
}

function renderOnlineUserCard(user) {
  return `
    <div class="pinned-item" data-user-id="${user.id}">
      <div class="pinned-avatar">
        <div class="avatar-placeholder">${escapeHtml(firstLetter(user.nickname))}</div>
        <div class="online-dot"></div>
      </div>
      <span class="pinned-name">${escapeHtml(user.nickname)}</span>
    </div>
  `
}

function renderChatListItem(user) {
  const history = state.messages.get(user.id) || []
  const lastMessage = history[history.length - 1]
  const preview = lastMessage ? lastMessage.text : "Start a conversation"
  const time = lastMessage ? formatTime(lastMessage.timestamp) : ""
  const activeClass = selectedUser?.id === user.id ? " chat-item-active" : ""

  return `
    <div class="chat-item${activeClass}" data-user-id="${user.id}">
      <div class="chat-avatar">
        <div class="avatar-placeholder">${escapeHtml(firstLetter(user.nickname))}</div>
        ${user.online ? '<div class="status"></div>' : ""}
      </div>
      <div class="chat-info">
        <div class="chat-name">${escapeHtml(user.nickname)}</div>
        <div class="chat-preview">${escapeHtml(preview)}</div>
      </div>
      <div class="chat-meta">
        <span class="chat-time">${escapeHtml(time)}</span>
      </div>
    </div>
  `
}

function ensureSelectedUser() {
  const chatUsers = getChatUsers()

  if (pendingSelectedUserId != null) {
    selectedUser = chatUsers.find((user) => user.id === pendingSelectedUserId) || selectedUser
    if (selectedUser?.id === pendingSelectedUserId) {
      pendingSelectedUserId = null
    }
  }

  if (!selectedUser && chatUsers.length) {
    selectedUser = chatUsers[0]
  } else if (selectedUser) {
    selectedUser = chatUsers.find((user) => user.id === selectedUser.id) || chatUsers[0] || null
  }

  if (selectedUser) {
    clearUnreadMessages(selectedUser.id)
  }

  updateSelectedHeader()
  renderMessages()
}

function updateSelectedHeader() {
  const nameNode = document.getElementById("chattingWith")
  const statusNode = document.getElementById("chattingStatus")
  const input = document.getElementById("messageInput")

  if (!nameNode || !statusNode || !input) return

  if (!selectedUser) {
    nameNode.textContent = "Select a user"
    statusNode.textContent = ""
    input.disabled = true
    return
  }
  nameNode.textContent = selectedUser.nickname
  statusNode.textContent = selectedUser.online ? "Online" : "Offline"
  input.disabled = false
}
function renderMessages() {
  const messagesBox = document.getElementById("chatMessages")
  if (!messagesBox) return
  if (!selectedUser) {
    messagesBox.innerHTML = `<div class="chat-empty">Choose a user to start chatting.</div>`
    return
  }
  const history = state.messages.get(selectedUser.id) || []
  if (!history.length) {
    messagesBox.innerHTML = `<div class="chat-empty">No messages yet with ${escapeHtml(selectedUser.nickname)}.</div>`
    return
  }
  const currentId = state.currentUserId
  messagesBox.innerHTML = history.map((message) => {
    const own = message.from === currentId
    return `
      <div class="message-row ${own ? "mine" : "theirs"}">
        <div class="message-bubble">
          <div class="message-text">${escapeHtml(message.text)}</div>
          <div class="message-time">${escapeHtml(formatTime(message.timestamp))}</div>
        </div>
      </div>
    `
  }).join("")
  messagesBox.scrollTop = messagesBox.scrollHeight
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

function setConnectionState(text) {
  const node = document.getElementById("chatConnectionState")
  if (node) node.textContent = text
}

function firstLetter(value = "?") {
  return value.charAt(0).toUpperCase()
}

function formatTime(value) {
  if (!value) return ""
  const date = new Date(value)
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function parseUserId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function isConversationOpen(userId) {
  return window.location.pathname === "/messages" && selectedUser?.id === userId
}

function clearUnreadMessages(userId = null) {
  if (userId == null) {
    unreadUserIds.clear()
  } else {
    unreadUserIds.delete(userId)
  }
  updateNotificationState()
}

function updateNotificationState() {
  const notificationBtn = document.getElementById("notificationBtn")
  const notificationDot = notificationBtn?.querySelector(".notification-dot")
  if (!notificationBtn || !notificationDot) return
  notificationBtn.classList.toggle("has-unread", unreadUserIds.size > 0)
}

function getChatUsers() {
  return state.users.filter((user) => user.id !== state.currentUserId)
}

function normalizeUser(user) {
  const id = parseUserId(user?.id)
  if (id == null) return null
  return {
    ...user,
    id,
    nickname: user?.nickname || `User ${id}`,
    online: Boolean(user?.online),
  }
}

function normalizeMessage(message) {
  const from = parseUserId(message?.from)
  const to = parseUserId(message?.to)
  if (from == null || to == null) return null
  return {
    ...message,
    from,
    to,
    timestamp: message?.timestamp || message?.time || null,
  }
}

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function messageLayout() {
  return `
    <div class="phone">
      <div class="content-chat messages-layout">
        <div class="messages-sidebar-panel">
          <div class="search-bar-chat">
            <span>Users</span>
          </div>

          <div class="chat-list" id="chatList"></div>
        </div>

        <div class="messages-chat-panel">
          <div class="messages-chat-header">
            <div>
              <div class="chat-name" id="chattingWith">Select a user</div>
              <div class="chat-preview" id="chattingStatus"></div>
            </div>
            <span class="chat-connection-state" id="chatConnectionState">Connecting...</span>
          </div>

          <div class="messages-box" id="chatMessages">
            <div class="chat-empty">Choose a user to start chatting.</div>
          </div>

          <div class="message-composer">
            <input id="messageInput" class="message-input" type="text" placeholder="Type a message" disabled>
            <button id="sendMessageBtn" class="send-message-btn">Send</button>
          </div>
        </div>
      </div>
    </div>
  `
}
