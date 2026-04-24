const state = {
  currentUserId: null,
  users: [],
  messages: new Map(),
  historyMeta: new Map(),
}

const unreadUserIds = new Set()

export function getState() {
  return state
}

export function clearState() {
  state.currentUserId = null
  state.users = []
  state.messages.clear()
  state.historyMeta.clear()
  unreadUserIds.clear()
}

export function getUnreadUserIds() {
  return unreadUserIds
}

export function resetSelectionState() {
  return { selectedUser: null, pendingSelectedUserId: null }
}

export function setCurrentUserId(userId) {
  state.currentUserId = userId
}

export function setUsers(users) {
  state.users = users
}

export function addUser(user) {
  state.users.push(user)
}

export function findUserById(userId) {
  return state.users.find((user) => user.id === userId)
}

export function markUserOnline(userId, nickname, isOnline) {
  const existing = findUserById(userId)
  if (existing) {
    existing.online = isOnline
    return
  }

  if (isOnline) {
    addUser({ id: userId, nickname: nickname || `User ${userId}`, online: true })
  }
}

export function ensureConversationState(userId) {
  if (!state.historyMeta.has(userId)) {
    state.historyMeta.set(userId, {
      loaded: false,
      loading: false,
      hasMore: true,
      lastIndex: 0,
      items: [],
    })
  }
  return state.historyMeta.get(userId)
}

export function getConversationItems(userId) {
  return ensureConversationState(userId).items
}

export function storeMessage(message) {
  const partnerId = message.from === state.currentUserId ? message.to : message.from
  const conversation = ensureConversationState(partnerId)
  if (!conversation.items.some((item) => item.id === message.id)) {
    conversation.items.push(message)
  }
  conversation.loaded = true
  conversation.lastIndex = conversation.items[0]?.id || 0
  state.messages.set(partnerId, conversation.items)
}

export function mergeHistoryPage(userId, messages, hasMore) {
  const conversation = ensureConversationState(userId)
  const existingIds = new Set(conversation.items.map((message) => message.id))
  const newMessages = messages.filter((message) => !existingIds.has(message.id))
  conversation.items = [...newMessages, ...conversation.items]
  conversation.loaded = true
  conversation.loading = false
  conversation.hasMore = hasMore
  conversation.lastIndex = conversation.items[0]?.id || 0
}

export function markConversationLoading(userId, loading) {
  ensureConversationState(userId).loading = loading
}

export function canLoadConversationHistory(userId) {
  const conversation = ensureConversationState(userId)
  return !conversation.loading && (conversation.hasMore || !conversation.loaded)
}

export function getConversationLastIndex(userId) {
  return ensureConversationState(userId).lastIndex
}

export function addUnreadUser(userId) {
  unreadUserIds.add(userId)
}

export function clearUnreadUsers(userId = null) {
  if (userId) unreadUserIds.delete(userId)
  else unreadUserIds.clear()
}

export function getSortedChatUsers() {
  return [...state.users.filter((user) => user.id !== state.currentUserId)].sort((a, b) => {
    const lastMessageA = ensureConversationState(a.id).items.slice(-1)[0]
    const lastMessageB = ensureConversationState(b.id).items.slice(-1)[0]

    const hasMessagesA = Boolean(lastMessageA)
    const hasMessagesB = Boolean(lastMessageB)

    if (hasMessagesA && hasMessagesB) {
      const timeA = new Date(lastMessageA.timestamp).getTime()
      const timeB = new Date(lastMessageB.timestamp).getTime()

      if (timeA !== timeB) {
        return timeB - timeA
      }
    }

    if (hasMessagesA !== hasMessagesB) {
      return hasMessagesA ? -1 : 1
    }

    return (a.nickname || "").localeCompare(b.nickname || "", undefined, {
      sensitivity: "base",
    })
  })
}

export function normalizeUser(user) {
  const id = parseUserId(user?.id)
  if (!id) return null
  return { ...user, id, nickname: user.nickname || `User ${id}`, online: !!user.online }
}

export function normalizeMessage(message) {
  const from = parseUserId(message?.from)
  const to = parseUserId(message?.to)
  if (!from || !to) return null
  return { ...message, from, to, timestamp: message.timestamp || message.time }
}

export function parseUserId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}
