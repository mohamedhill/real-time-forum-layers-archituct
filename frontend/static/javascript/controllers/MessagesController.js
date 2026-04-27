import * as navigate from "../navigation/Navigation.js"
import * as HomeView from "../views/HomeView.js"
import * as AuthModel from "../models/AuthModel.js"
import * as MessageModel from "../models/MessageModel.js"
import { showErrorPopup } from "../helpers/error.js"

let socket = null
let selectedUser = null
let pendingSelectedUserId = null
let notificationCloserBound = false
let sessionWatchdogId = null
let lastSessionCheckAt = 0
let sessionCheckPromise = null
let loginRedirecting = false
let sendMessageCooldownUntil = 0
let typingStopTimerId = null
let activeTypingReceiverId = null
const incomingTypingTimeouts = new Map()
let lastTypingSentAt = 0

const SEND_MESSAGE_DEBOUNCE_MS = 500
const TYPING_HEARTBEAT_MS = 900

export function initializeOnlineUsers() {
  updateNotificationState()
  bindNotificationEvents()
  connectMessagesSocket()
}

export function disconnectMessagesSocket() {
  stopTyping()
  clearAllIncomingTyping()
  if (!socket) return
  socket.close()
  socket = null
  if (sessionWatchdogId) {
    clearInterval(sessionWatchdogId)
    sessionWatchdogId = null
  }
}

export function resetMessagesViewState() {
  const rightSidebar = HomeView.restoreRightSidebar()
  if (rightSidebar) {
    rightSidebar.classList.remove("visible", "chat-fullscreen")
  }

  const reset = MessageModel.resetSelectionState()
  selectedUser = reset.selectedUser
  pendingSelectedUserId = reset.pendingSelectedUserId
  stopTyping()
  clearAllIncomingTyping()
}

export function ShowMessagesPage(url = new URL(window.location.href)) {
  const rightSidebar = document.getElementsByClassName("right-sidebar")[0]
  if (!rightSidebar) {
    window.location.href = "/"
    return
  }

  pendingSelectedUserId = MessageModel.parseUserId(url.searchParams.get("user"))

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

async function ensureSessionValid({ throttleMs = 4000 } = {}) {
  const now = Date.now()
  if (now - lastSessionCheckAt < throttleMs) return true
  if (sessionCheckPromise) return sessionCheckPromise

  sessionCheckPromise = (async () => {
    try {
      const result = await AuthModel.checkSession()
      lastSessionCheckAt = Date.now()
      if (result.ok) {
        const userId = MessageModel.parseUserId(result.data?.userID)
        if (userId) MessageModel.setCurrentUserId(userId)
        window.currentUser = result.data?.nickname || window.currentUser
        window.currentUserId = userId ?? window.currentUserId
        return true
      }
      handleSessionInvalid()
      return false
    } finally {
      sessionCheckPromise = null
    }
  })()

  return sessionCheckPromise
}

function handleSessionInvalid() {
  disconnectMessagesSocket()
  MessageModel.clearState()
  MessageModel.setCurrentUserId(null)
  window.currentUser = null
  window.currentUserId = null

  MessageModel.clearUnreadUsers()
  updateNotificationState()

  const input = document.getElementById("messageInput")
  const sendBtn = document.getElementById("sendMessageBtn")
  if (input) input.disabled = true
  if (sendBtn) sendBtn.disabled = true
  setConnectionState("Logged out")

  const box = document.getElementById("chatMessages")
  if (box) box.innerHTML = `<div class="chat-empty">Your session is no longer valid. Please log in again.</div>`

  if (!loginRedirecting) {
    loginRedirecting = true
    try {
      if (window.navigation?.navigate) window.navigation.navigate("/login")
      else window.location.href = "/login"
    } finally {
      setTimeout(() => { loginRedirecting = false }, 250)
    }
  }
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
  input?.addEventListener("input", handleTypingInput)

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
  }, 30))
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
  console.log(socket);
  
  socket.addEventListener("open", () => {
    //setConnectionState("Connected")
    socket.send(JSON.stringify({ type: "users" }))
    if (!sessionWatchdogId) {
      sessionWatchdogId = setInterval(() => {
        ensureSessionValid({ throttleMs: 0 })
      }, 5000)
    }
  })

  socket.addEventListener("message", async (event) => {
    const valid = await ensureSessionValid()
    if (!valid) return

    const payload = JSON.parse(event.data)
    
    if (payload.type === "users") {
      const state = MessageModel.getState()
      MessageModel.setCurrentUserId(MessageModel.parseUserId(payload.data?.currentUserId) ?? state.currentUserId)
      MessageModel.setUsers((payload.data?.users || []).map(MessageModel.normalizeUser).filter(Boolean))
      renderUsers()
      if (document.getElementById("chatList")) ensureSelectedUser()
      return
    }

    if (payload.type === "online" || payload.type === "offline") {
      const id = MessageModel.parseUserId(payload.userId || payload.data?.userId || payload.id)
      const isOnline = payload.type === "online"
      MessageModel.markUserOnline(id, payload.nickname, isOnline)
      renderUsers()
      return
    }

    if (payload.type === "message") {
      const message = MessageModel.normalizeMessage(payload.data || payload)
      if (!message) return
      clearIncomingTyping(message.from)
      const state = MessageModel.getState()
      if (message.from != null && message.from !== state.currentUserId) {
        const exists = state.users.some((u) => u.id === message.from)
        if (!exists) {
          MessageModel.addUser({
            id: message.from,
            nickname: message.senderNickname || `User ${message.from}`,
            online: false,
          })
        }
      }
      MessageModel.storeMessage(message)
      if (message.from !== state.currentUserId && !isConversationOpen(message.from)) {
        MessageModel.addUnreadUser(message.from)
      }
      renderUsers()
      if (message.from === selectedUser?.id || message.to === selectedUser?.id) {
        renderMessages()
      }
      updateNotificationState()
      return
    }

    if (payload.type === "history") {
      const partnerId = MessageModel.parseUserId(payload.data?.userId)
      if (partnerId == null) return
      const lastIndex = Number(payload.data?.lastIndex) || 0
      const messages = (payload.data?.items || []).map(MessageModel.normalizeMessage).filter(Boolean)
      MessageModel.mergeHistoryPage(partnerId, messages, Boolean(payload.data?.hasMore))
      renderUsers()
      if (selectedUser?.id === partnerId) {
        renderMessages({ preserveScroll: lastIndex > 0, prependCount: messages.length })
      }
      return
    }

    if (payload.type === "typing" || payload.type === "stopTyping") {
      const senderId = MessageModel.parseUserId(payload.senderId || payload.data?.senderId)
      if (!senderId) return

      if (payload.type === "typing") {
        markIncomingTyping(senderId)
      } else {
        clearIncomingTyping(senderId)
      }

      if (selectedUser?.id === senderId) {
        renderMessages()
        updateSelectedHeader()
      }
      return
    }

    if (payload.type === "error") {
      showErrorPopup(payload.data?.message || "Something went wrong")
    }
  })

  socket.addEventListener("close", () => {
    setConnectionState("Disconnected")
    socket = null
    if (sessionWatchdogId) {
      clearInterval(sessionWatchdogId)
      sessionWatchdogId = null
    }
  })
}

function renderUsers() {
  const chatUsers = MessageModel.getSortedChatUsers()
  renderChatUsers(chatUsers)
  renderSidebarUsers(chatUsers)
}

function renderChatListItem(user) {
  const history = MessageModel.getConversationItems(user.id)
  const lastMessage = history[history.length - 1]
  const preview = lastMessage?.text || user.lastMessageText || "Start a conversation"
  const activeClass = selectedUser?.id === user.id ? " chat-item-active" : ""
  const hasUnread = MessageModel.getUnreadUserIds().has(user.id) ? " unread-indicator" : ""

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
      if (activeTypingReceiverId && activeTypingReceiverId !== user.id) {
        stopTyping(activeTypingReceiverId)
      }
      updateSelectedHeader()
      renderUsers()
      renderMessages()
      loadConversationHistory(user.id)
      if (enterChat) enterConversationView()
      else if (window.navigation?.navigate) window.navigation.navigate(`/messages?user=${user.id}`)
      else window.location.href = `/messages?user=${user.id}`
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

  const history = MessageModel.getConversationItems(selectedUser.id)
  const currentId = MessageModel.getState().currentUserId
  const selectedUserIsTyping = isUserTyping(selectedUser.id)

  if (!history.length && !selectedUserIsTyping) {
    messagesBox.innerHTML = `<div class="chat-empty">No messages yet, say hi.</div>`
    return
  }

  const markup = history.map((message) => {
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
  })

  if (selectedUserIsTyping) {
    markup.push(`
      <div class="message-row theirs typing-row">
        <div class="message-bubble typing-bubble" aria-label="${escapeHtml(selectedUser.nickname)} is typing">
          <div class="typing-author">${escapeHtml(selectedUser.nickname)} is typing</div>
          <div class="typing-dots" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    `)
  }

  messagesBox.innerHTML = markup.join("")

  if (preserveScroll && prependCount > 0) {
    messagesBox.scrollTop = messagesBox.scrollHeight - previousHeight + previousTop
  } else {
    messagesBox.scrollTop = messagesBox.scrollHeight
  }
}

function sendMessage() {
  const now = Date.now()
  if (now < sendMessageCooldownUntil) return

  const input = document.getElementById("messageInput")
  if (!input || !selectedUser || !socket || socket.readyState !== WebSocket.OPEN) return
  const text = input.value.trim()
  if (!text) return
  if (selectedUser.id === MessageModel.getState().currentUserId) {
    showErrorPopup("You cannot send a message to yourself")
    return
  }
  if ([...text].length > 500) {
    showErrorPopup("Message cannot be more than 500 characters")
    return
  }
  sendMessageCooldownUntil = now + SEND_MESSAGE_DEBOUNCE_MS
  ensureSessionValid({ throttleMs: 0 }).then((ok) => {
    if (!ok) {
      sendMessageCooldownUntil = 0
      return
    }
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      sendMessageCooldownUntil = 0
      return
    }
    socket.send(JSON.stringify({
      type: "message",
      receiver: selectedUser.id,
      message: text,
    }))
    input.value = ""
    stopTyping(selectedUser.id)
  }).catch(() => {
    sendMessageCooldownUntil = 0
  })
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
  stopTyping()
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
              <input minlength="1" maxlength="500"  id="messageInput" class="message-input" type="text" placeholder="Type a message..." disabled>
            <button id="sendMessageBtn" class="send-message-btn">
  <i class="ri-send-plane-fill"></i>
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
  const chatUsers = MessageModel.getSortedChatUsers()
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
  statusNode.textContent = isUserTyping(selectedUser.id) ? "Typing..." : (selectedUser.online ? "Online" : "Offline")
  input.disabled = false
}

function loadConversationHistory(userId) {
  if (!MessageModel.canLoadConversationHistory(userId)) return
  if (!socket || socket.readyState !== WebSocket.OPEN) return
  MessageModel.markConversationLoading(userId, true)
  socket.send(JSON.stringify({ type: "history", receiver: userId, lastIndex: MessageModel.getConversationLastIndex(userId), limit: 10 }))
}

function setConnectionState(text) {
  const node = document.getElementById("chatConnectionState")
  if (node) node.textContent = text
}

function handleTypingInput() {
  const input = document.getElementById("messageInput")
  if (!input || !selectedUser) return

  const hasText = input.value.trim().length > 0
  if (!hasText) {
    stopTyping(selectedUser.id)
    return
  }

  const now = Date.now()
  if (
    activeTypingReceiverId !== selectedUser.id ||
    now - lastTypingSentAt >= TYPING_HEARTBEAT_MS
  ) {
    sendTypingState("typing", selectedUser.id, { force: true })
  }

  if (typingStopTimerId) clearTimeout(typingStopTimerId)
  typingStopTimerId = setTimeout(() => {
    stopTyping(selectedUser?.id)
  }, 1200)
}

function sendTypingState(type, receiverId, { force = false } = {}) {
  if (!receiverId || !socket || socket.readyState !== WebSocket.OPEN) return
  if (receiverId === MessageModel.getState().currentUserId) return

  if (type === "typing" && activeTypingReceiverId === receiverId && !force) return
  if (type === "stopTyping" && activeTypingReceiverId !== receiverId) return

  socket.send(JSON.stringify({
    type,
    receiver: receiverId,
  }))

  if (type === "typing") {
    activeTypingReceiverId = receiverId
    lastTypingSentAt = Date.now()
  } else {
    activeTypingReceiverId = null
    lastTypingSentAt = 0
  }
}

function stopTyping(receiverId = activeTypingReceiverId) {
  if (typingStopTimerId) {
    clearTimeout(typingStopTimerId)
    typingStopTimerId = null
  }
  if (!receiverId) return
  sendTypingState("stopTyping", receiverId)
}

function markIncomingTyping(userId) {
  clearIncomingTyping(userId)
  incomingTypingTimeouts.set(userId, setTimeout(() => {
    clearIncomingTyping(userId)
    if (selectedUser?.id === userId) {
      renderMessages()
      updateSelectedHeader()
    }
  }, 1800))
}

function clearIncomingTyping(userId) {
  const timeoutId = incomingTypingTimeouts.get(userId)
  if (timeoutId) clearTimeout(timeoutId)
  incomingTypingTimeouts.delete(userId)
}

function clearAllIncomingTyping() {
  incomingTypingTimeouts.forEach((timeoutId) => clearTimeout(timeoutId))
  incomingTypingTimeouts.clear()
}

function isUserTyping(userId) {
  return incomingTypingTimeouts.has(userId)
}

function firstLetter(v = "?") { return v.charAt(0).toUpperCase() }
function formatTime(v) { return v ? new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "" }
function formatDateTime(v) {
  if (!v) return ""
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString([], { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
}
function isConversationOpen(id) { return selectedUser?.id === id }

function clearUnreadMessages(id = null) {
  MessageModel.clearUnreadUsers(id)
  updateNotificationState()
}

function updateNotificationState() {
  const btn = document.getElementById("notificationBtn")
  if (btn) btn.classList.toggle("has-unread", MessageModel.getUnreadUserIds().size > 0)
  renderNotificationPanel()
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
      const userId = MessageModel.parseUserId(node.dataset.userId)
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
  const unread = [...MessageModel.getUnreadUserIds()]
  if (!unread.length) return `<div class="notification-empty">No new messages.</div>`

  const items = unread
    .map((id) => {
      const user = MessageModel.findUserById(id) || { id, nickname: `User ${id}` }

      return `
        <button class="notification-item" type="button" data-user-id="${id}">
          <div class="notification-item-text">You got a new message from "${escapeHtml(user.nickname)}"</div>
        </button>
      `
    })
    .join("")

  return items
}
