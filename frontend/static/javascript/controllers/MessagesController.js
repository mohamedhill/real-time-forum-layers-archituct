import * as navigate from "../navigation/Navigation.js"

let socket = null
let selectedUser = null

const state = {
  currentUserId: null,
  users: [],
  messages: new Map(),
}

export function ShowMessagesPage() {
  const rightSidebar = document.getElementsByClassName("right-sidebar")[0]
  if (!rightSidebar) {
    window.location.href = "/"
    return
  }

  rightSidebar.classList.add("visible")
  navigate.setActiveNav("/messages")
  rightSidebar.innerHTML = messageLayout()

  bindStaticEvents()
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
      state.currentUserId = payload.data?.currentUserId ?? state.currentUserId
      state.users = payload.data?.users || []
      renderUsers()
      ensureSelectedUser()
      return
    }

    if (payload.type === "message") {
      const message = payload.data
      storeMessage(message)
      renderUsers()

      if (
        message.from === selectedUser?.id ||
        message.to === selectedUser?.id
      ) {
        renderMessages()
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
