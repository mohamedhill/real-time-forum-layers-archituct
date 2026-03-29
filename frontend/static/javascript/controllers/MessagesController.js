import * as navigate from "../navigation/Navigation.js"

let socket = null
let selectedUser = null
let pendingSelectedUserId = null
const unreadUserIds = new Set()

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
  const messagesBox = document.getElementById("chatMessages")

  sendBtn?.addEventListener("click", sendMessage)
  input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault()
      sendMessage()
    }
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
  const conversation = ensureConversationState(partnerId)
  if (!conversation.items.some((item) => item.id === message.id)) {
    conversation.items.push(message)
  }
  conversation.loaded = true
  conversation.offset = conversation.items.length
  state.messages.set(partnerId, conversation.items)
}

function renderUsers() {
  const sidebarOnlineList = document.getElementById("sidebarOnlineList")
  const chatList = document.getElementById("chatList")
  const chatUsers = getSortedChatUsers()
  
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
      resetConversationHistory(user.id)
      updateSelectedHeader()
      renderUsers()
      renderMessages()
      loadConversationHistory(user.id)
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
  const history = ensureConversationState(user.id).items
  const lastMessage = history[history.length - 1]
  const preview = lastMessage?.text || user.lastMessageText || "Start a conversation"
  const timeValue = lastMessage?.timestamp || user.lastMessageTime
  const time = timeValue ? formatTime(timeValue) : ""
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
  const chatUsers = getSortedChatUsers()

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
  if (selectedUser) {
    resetConversationHistory(selectedUser.id)
    loadConversationHistory(selectedUser.id)
  }
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
  if (!history.length) {
    messagesBox.innerHTML = `<div class="chat-empty">No messages yet with ${escapeHtml(selectedUser.nickname)}.</div>`
    return
  }
  const currentId = state.currentUserId
  messagesBox.innerHTML = history.map((message) => {
    const own = message.from === currentId
    const author = own ? "You" : (message.senderNickname || selectedUser.nickname)
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
    return
  }
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
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
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
  const notificationWrapper = document.getElementById("notificationWrapper")
  const notificationBtn = document.getElementById("notificationBtn")
  const notificationPanel = document.getElementById("notificationPanel")
  const notificationDot = notificationBtn?.querySelector(".notification-dot")
  if (!notificationWrapper || !notificationBtn || !notificationDot || !notificationPanel) return
  notificationBtn.classList.toggle("has-unread", unreadUserIds.size > 0)
  notificationWrapper.classList.toggle("has-unread", unreadUserIds.size > 0)
  notificationPanel.innerHTML = renderNotificationItems()

  notificationPanel.querySelectorAll("[data-notification-user-id]").forEach((node) => {
    node.addEventListener("click", () => {
      const userId = parseUserId(node.dataset.notificationUserId)
      if (userId == null) return
      clearUnreadMessages(userId)
      notificationWrapper.classList.remove("is-open")
      navigation.navigate(`/messages?user=${userId}`)
    })
  })
}

function bindNotificationEvents() {
  const notificationWrapper = document.getElementById("notificationWrapper")
  const notificationBtn = document.getElementById("notificationBtn")
  if (!notificationWrapper || !notificationBtn || notificationBtn.dataset.bound === "true") return

  notificationBtn.dataset.bound = "true"
  notificationBtn.addEventListener("click", (event) => {
    event.stopPropagation()
    notificationWrapper.classList.toggle("is-open")
    updateNotificationState()
  })

  if (!window.notificationPanelCloser) {
    window.notificationPanelCloser = (event) => {
      const wrapper = document.getElementById("notificationWrapper")
      if (!wrapper) return
      if (event && wrapper.contains(event.target)) return
      wrapper.classList.remove("is-open")
    }
    document.addEventListener("click", window.notificationPanelCloser)
  }
}

function renderNotificationItems() {
  const unreadUsers = Array.from(unreadUserIds)
    .map((userId) => state.users.find((user) => user.id === userId))
    .filter(Boolean)

  if (!unreadUsers.length) {
    return `<div class="notification-empty">No new messages</div>`
  }

  return unreadUsers.map((user) => `
    <button class="notification-item" type="button" data-notification-user-id="${user.id}">
      <span class="notification-item-text">You got a new message from ${escapeHtml(user.nickname)}</span>
    </button>
  `).join("")
}

function getChatUsers() {
  return state.users.filter((user) => user.id !== state.currentUserId)
}

function getSortedChatUsers() {
  return [...getChatUsers()].sort((firstUser, secondUser) => {
    const firstTime = getLastMessageTime(firstUser.id)
    const secondTime = getLastMessageTime(secondUser.id)
    return secondTime - firstTime
  })
}

function getLastMessageTime(userId) {
  const history = ensureConversationState(userId).items
  const lastMessage = history[history.length - 1]
  const fallbackTime = state.users.find((user) => user.id === userId)?.lastMessageTime
  const value = lastMessage?.timestamp || fallbackTime
  if (!value) return 0
  return new Date(value).getTime() || 0
}

function normalizeUser(user) {
  const id = parseUserId(user?.id)
  if (id == null) return null
  return {
    ...user,
    id,
    nickname: user?.nickname || `User ${id}`,
    online: Boolean(user?.online),
    lastMessageText: user?.lastMessageText || "",
    lastMessageTime: user?.lastMessageTime || "",
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

function ensureConversationState(userId) {
  if (!state.historyMeta.has(userId)) {
    state.historyMeta.set(userId, {
      loaded: false,
      loading: false,
      hasMore: true,
      offset: 0,
      items: [],
    })
  }
  const conversation = state.historyMeta.get(userId)
  state.messages.set(userId, conversation.items)
  return conversation
}

function resetConversationHistory(userId) {
  state.historyMeta.set(userId, {
    loaded: false,
    loading: false,
    hasMore: true,
    offset: 0,
    items: [],
  })
  state.messages.set(userId, [])
}

function loadConversationHistory(userId) {
  const conversation = ensureConversationState(userId)
  if (conversation.loading || (!conversation.hasMore && conversation.loaded)) return
  if (!socket || socket.readyState !== WebSocket.OPEN) return

  conversation.loading = true
  socket.send(JSON.stringify({
    type: "history",
    receiver: userId,
    offset: conversation.offset,
    limit: 10,
  }))
}

function mergeHistoryPage(userId, messages, hasMore) {
  const conversation = ensureConversationState(userId)
  const existingIds = new Set(conversation.items.map((message) => message.id))
  const olderMessages = messages.filter((message) => !existingIds.has(message.id))

  conversation.items = [...olderMessages, ...conversation.items]
  conversation.loaded = true
  conversation.loading = false
  conversation.hasMore = hasMore
  conversation.offset = conversation.items.length
  state.messages.set(userId, conversation.items)

  const user = state.users.find((item) => item.id === userId)
  const latestMessage = conversation.items[conversation.items.length - 1]
  if (user && latestMessage) {
    user.lastMessageText = latestMessage.text
    user.lastMessageTime = latestMessage.timestamp
  }
}

function throttle(callback, delay) {
  let lastRun = 0
  let timeoutId = null

  return (...args) => {
    const now = Date.now()
    const remaining = delay - (now - lastRun)

    if (remaining <= 0) {
      lastRun = now
      callback(...args)
      return
    }

    if (timeoutId) return
    timeoutId = window.setTimeout(() => {
      lastRun = Date.now()
      timeoutId = null
      callback(...args)
    }, remaining)
  }
}

function debounce(callback, delay) {
  let timeoutId = null

  return (...args) => {
    if (timeoutId) {
      window.clearTimeout(timeoutId)
    }
    timeoutId = window.setTimeout(() => {
      timeoutId = null
      callback(...args)
    }, delay)
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
