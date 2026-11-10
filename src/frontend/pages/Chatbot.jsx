import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import mcuMainLogo from '../../assets/mcu-main-logo.png'
import mcuLogoCircle from '../../assets/mcu-logo-circle.png'
import mcuSmallLogo from '../../assets/mcu-sm-logo.png'
import {
  AUTH_SESSION_CHANGED_EVENT,
  clearStoredSession,
  getStoredTokenPayload,
  getStoredUser,
  isLoggedIn,
} from '../../services/apiClient'
import apiFetch, { API_BASE_URL } from '../../services/apiClient'
import MessageBubble from '../components/MessageBubble'
import { askChatbotStream } from '../services/chatService'
import {
  buildRecentConversations,
  buildSmartSuggestions,
  getCurrentTime,
  getEmbedOrigin,
  getMessagePreview,
  initialThreads,
  isDefaultAssistantGreeting,
  isFollowUpScreenshotRequest,
} from '../utils/chatbotUtils'

const AUTH_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000
const AUTH_MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000
const guestMessageCountKey = 'mcuGuestMessageCount'
const AUTH_LAST_ACTIVITY_KEY = 'mcuChatbotLastActivityAt'
const AUTH_SESSION_CREATED_KEY = 'mcuChatbotSessionCreatedAt'
const MICROSOFT_RETURN_PATH_KEY = 'mcuMicrosoftReturnPath'
const CHATBOT_LOGIN_TOAST_KEY = 'mcuChatbotLoginToast'
const CHAT_HISTORY_STORAGE_PREFIX = 'mcuChatbotHistory'
const animatedPlaceholderPrompt = 'Start typing your question...'
const ASSISTANT_NAME = 'Centralino Virtual Assistant'
const MAX_STORED_CHAT_THREADS = 30
const MAX_MESSAGES_PER_STORED_THREAD = 80

function formatLibraryDate(value) {
  if (!value) {
    return 'Unknown'
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function getLibraryFileType(filePath = '') {
  const extension = filePath.split('.').pop()

  return extension ? extension.toUpperCase() : 'DOC'
}

function getLibraryAssetUrl(url = '') {
  if (!url) {
    return ''
  }

  return new URL(url, API_BASE_URL).toString()
}

function getChatHistoryUserKey(user) {
  return String(user?.email || user?.id || 'guest')
    .toLowerCase()
    .replace(/[^a-z0-9@._-]/g, '_')
}

function getChatHistoryStorageKey(user, scope = 'general') {
  return `${CHAT_HISTORY_STORAGE_PREFIX}:${getChatHistoryUserKey(user)}:${scope || 'general'}`
}

function normalizeStoredThreads(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return initialThreads
  }

  const threads = value
    .filter((thread) => thread?.id)
    .map((thread) => ({
      id: String(thread.id),
      title: thread.title || 'New chat',
      topic: thread.topic || 'General',
      updatedAt: thread.updatedAt || 'Just now',
      lastActivityAt: Number(thread.lastActivityAt || 0),
      messages: Array.isArray(thread.messages)
        ? thread.messages.slice(-MAX_MESSAGES_PER_STORED_THREAD)
        : [],
    }))

  return threads.length > 0 ? threads : initialThreads
}

function loadStoredChatThreads(user, scope) {
  if (!user) {
    return initialThreads
  }

  try {
    const rawValue = localStorage.getItem(getChatHistoryStorageKey(user, scope))
    return normalizeStoredThreads(JSON.parse(rawValue || '[]'))
  } catch {
    return initialThreads
  }
}

function saveStoredChatThreads(user, scope, threads) {
  if (!user) {
    return
  }

  const storedThreads = normalizeStoredThreads(threads)
    .filter((thread) => thread.messages.length > 0 || !['New chat', 'New conversation'].includes(thread.title))
    .slice(0, MAX_STORED_CHAT_THREADS)

  try {
    localStorage.setItem(
      getChatHistoryStorageKey(user, scope),
      JSON.stringify(storedThreads.length > 0 ? storedThreads : initialThreads),
    )
  } catch {
    // Ignore storage quota/private mode errors. Chat can continue without local history.
  }
}

function isUnsavedEmptyThread(thread) {
  return thread.messages.length === 0 && ['New chat', 'New conversation'].includes(thread.title)
}

function createEmptyChatThread(id = `chat-${Date.now()}`) {
  return {
    id,
    title: 'New chat',
    topic: 'General',
    updatedAt: 'Just now',
    messages: [],
    lastActivityAt: 0,
  }
}

function prepareThreadsForFreshStart(threads) {
  const savedThreads = normalizeStoredThreads(threads).filter((thread) => !isUnsavedEmptyThread(thread))
  const freshThread = createEmptyChatThread(`chat-${Date.now()}`)

  return {
    activeThreadId: freshThread.id,
    threads: [freshThread, ...savedThreads],
  }
}

function getLastActivityAt() {
  return Number(localStorage.getItem(AUTH_LAST_ACTIVITY_KEY) || 0)
}

function getSessionCreatedAt() {
  return Number(localStorage.getItem(AUTH_SESSION_CREATED_KEY) || 0)
}

function setLastActivityAt(value = Date.now()) {
  localStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(value))
}

function clearChatbotSessionState() {
  clearStoredSession()
  localStorage.removeItem(guestMessageCountKey)
  localStorage.removeItem(AUTH_LAST_ACTIVITY_KEY)
  localStorage.removeItem(AUTH_SESSION_CREATED_KEY)
}

function isInactiveSessionExpired() {
  const lastActivityAt = getLastActivityAt()
  return !lastActivityAt || Date.now() - lastActivityAt >= AUTH_INACTIVITY_TIMEOUT_MS
}

function isMaxSessionAgeExpired() {
  const sessionCreatedAt = getSessionCreatedAt()
  return !sessionCreatedAt || Date.now() - sessionCreatedAt >= AUTH_MAX_SESSION_AGE_MS
}

function isChatbotSessionExpired() {
  return isInactiveSessionExpired() || isMaxSessionAgeExpired()
}

function getInitialToastMessage() {
  const loginToastMessage = sessionStorage.getItem(CHATBOT_LOGIN_TOAST_KEY) || ''

  if (loginToastMessage) {
    sessionStorage.removeItem(CHATBOT_LOGIN_TOAST_KEY)
  }

  return loginToastMessage
}

function getInitials(name = '', email = '') {
  const source = name || email || 'Student'
  const parts = source
    .replace(/@.*/, '')
    .split(/[\s._-]+/)
    .filter(Boolean)

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'S'
}

function Chatbot() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isEmbedMode = searchParams.get('embed') === '1'
  const isCompactEmbedMode = isEmbedMode && searchParams.get('compact') === '1'
  const siteScope = searchParams.get('scope') || 'general'
  const explicitEmbedOrigin = searchParams.get('embedOrigin')
  const embedToken = searchParams.get('embedToken') || ''
  const embedOrigin = useMemo(
    () => getEmbedOrigin(isEmbedMode, explicitEmbedOrigin),
    [explicitEmbedOrigin, isEmbedMode],
  )
  const [message, setMessage] = useState('')
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
  const [chatThreads, setChatThreads] = useState(initialThreads)
  const [activeThreadId, setActiveThreadId] = useState(initialThreads[0].id)
  const [highlightedMessageKey, setHighlightedMessageKey] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(() => isLoggedIn() && !isChatbotSessionExpired())
  const [currentUser, setCurrentUser] = useState(() => (
    isLoggedIn() && !isChatbotSessionExpired() ? getStoredUser() || getStoredTokenPayload() || null : null
  ))
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isMicrosoftSigningIn, setIsMicrosoftSigningIn] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [toastMessage, setToastMessage] = useState(getInitialToastMessage)
  const [brokenHeaderPhotoUrl, setBrokenHeaderPhotoUrl] = useState('')
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [libraryDocuments, setLibraryDocuments] = useState([])
  const [librarySearch, setLibrarySearch] = useState('')
  const [isLibraryLoading, setIsLibraryLoading] = useState(false)
  const [libraryError, setLibraryError] = useState('')
  const [selectedLibraryDocument, setSelectedLibraryDocument] = useState(null)
  const [isLibraryPreviewLoading, setIsLibraryPreviewLoading] = useState(false)
  const [libraryPreviewError, setLibraryPreviewError] = useState('')
  const [placeholderCharIndex, setPlaceholderCharIndex] = useState(0)
  const [isPlaceholderDeleting, setIsPlaceholderDeleting] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [openRecentMenuId, setOpenRecentMenuId] = useState('')
  // Id of the assistant reply currently playing the typing animation (not persisted).
  const [animatingReplyId, setAnimatingReplyId] = useState('')
  // Id of the assistant reply currently being streamed from the server (not persisted).
  const [streamingReplyId, setStreamingReplyId] = useState('')
  const typingTimerRef = useRef(null)
  const highlightTimerRef = useRef(null)
  const inactivityTimerRef = useRef(null)
  const submitLockRef = useRef(false)
  const bottomRef = useRef(null)
  const chatStreamRef = useRef(null)
  const recentPanelRef = useRef(null)
  const activityCounterRef = useRef(initialThreads.length)
  const toastTimerRef = useRef(null)
  const loadedHistoryKeyRef = useRef('')

  const activeThread = useMemo(
    () => chatThreads.find((thread) => thread.id === activeThreadId) ?? chatThreads[0],
    [activeThreadId, chatThreads],
  )
  const recentConversations = buildRecentConversations(chatThreads)
  const filteredLibraryDocuments = useMemo(() => {
    const normalizedSearch = librarySearch.trim().toLowerCase()

    return libraryDocuments.filter((document) => {
      const matchesScope = !siteScope || siteScope === 'general' || document.siteScope === siteScope || document.siteScope === 'general'
      const matchesSearch = !normalizedSearch || [
        document.title,
        document.siteScope,
        document.type,
        document.uploadedBy,
      ].join(' ').toLowerCase().includes(normalizedSearch)

      return matchesScope && matchesSearch
    })
  }, [libraryDocuments, librarySearch, siteScope])
  const smartSuggestions = useMemo(
    () => buildSmartSuggestions(message, []),
    [message],
  )
  const visibleSmartSuggestions = isCompactEmbedMode ? smartSuggestions.slice(0, 3) : smartSuggestions
  const hasAuthenticatedSession = isAuthenticated || isLoggedIn()
  const requiresSsoLogin = !hasAuthenticatedSession
  const hasConversationStarted = activeThread?.messages.some((messageItem) => messageItem.role === 'user') || isTyping
  const headerDisplayName = currentUser?.name || currentUser?.email || 'Student'
  const headerPhotoUrl = currentUser?.photoUrl && currentUser.photoUrl !== brokenHeaderPhotoUrl ? currentUser.photoUrl : ''
  const headerInitials = getInitials(currentUser?.name, currentUser?.email)
  const placeholderText = animatedPlaceholderPrompt.slice(0, placeholderCharIndex)
  const chatHistoryStorageKey = hasAuthenticatedSession && currentUser
    ? getChatHistoryStorageKey(currentUser, siteScope)
    : ''

  useEffect(() => {
    let loadTimer = null

    if (!chatHistoryStorageKey || !currentUser) {
      loadedHistoryKeyRef.current = ''
      loadTimer = window.setTimeout(() => {
        setChatThreads(initialThreads)
        setActiveThreadId(initialThreads[0].id)
      }, 0)
      return () => window.clearTimeout(loadTimer)
    }

    loadTimer = window.setTimeout(() => {
      const storedThreads = loadStoredChatThreads(currentUser, siteScope)
      const freshStart = prepareThreadsForFreshStart(storedThreads)

      setChatThreads(freshStart.threads)
      setActiveThreadId(freshStart.activeThreadId)
      loadedHistoryKeyRef.current = chatHistoryStorageKey
    }, 0)

    return () => window.clearTimeout(loadTimer)
  }, [chatHistoryStorageKey, currentUser, siteScope])

  useEffect(() => {
    if (!chatHistoryStorageKey || !currentUser || loadedHistoryKeyRef.current !== chatHistoryStorageKey) {
      return
    }

    saveStoredChatThreads(currentUser, siteScope, chatThreads)
  }, [chatHistoryStorageKey, chatThreads, currentUser, siteScope])

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
      }

      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current)
      }

      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }

      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!openRecentMenuId) {
      return undefined
    }

    const closeRecentMenu = () => setOpenRecentMenuId('')

    window.addEventListener('click', closeRecentMenu)
    window.addEventListener('keydown', closeRecentMenu)

    return () => {
      window.removeEventListener('click', closeRecentMenu)
      window.removeEventListener('keydown', closeRecentMenu)
    }
  }, [openRecentMenuId])

  useEffect(() => {
    const isComplete = placeholderCharIndex === animatedPlaceholderPrompt.length
    const isEmpty = placeholderCharIndex === 0
    const delay = isComplete && !isPlaceholderDeleting ? 1300 : isEmpty && isPlaceholderDeleting ? 320 : isPlaceholderDeleting ? 32 : 58

    const timerId = window.setTimeout(() => {
      if (isComplete && !isPlaceholderDeleting) {
        setIsPlaceholderDeleting(true)
        return
      }

      if (isEmpty && isPlaceholderDeleting) {
        setIsPlaceholderDeleting(false)
        return
      }

      setPlaceholderCharIndex((currentIndex) => currentIndex + (isPlaceholderDeleting ? -1 : 1))
    }, delay)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [isPlaceholderDeleting, placeholderCharIndex])

  useEffect(() => {
    if (!toastMessage) {
      return
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage('')
      toastTimerRef.current = null
    }, 3200)

    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
        toastTimerRef.current = null
      }
    }
  }, [toastMessage])

  useEffect(() => {
    function clearInactivityTimer() {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
        inactivityTimerRef.current = null
      }
    }

    function logoutInactiveUser() {
      if (!isLoggedIn()) {
        return
      }

      clearChatbotSessionState()
      setIsAuthenticated(false)
      setCurrentUser(null)
      setIsLoginModalOpen(false)
      setIsMicrosoftSigningIn(false)
      setLoginError('')
    }

    function resetInactivityTimer() {
      clearInactivityTimer()

      if (!isLoggedIn()) {
        return
      }

      setLastActivityAt()
      inactivityTimerRef.current = window.setTimeout(logoutInactiveUser, AUTH_INACTIVITY_TIMEOUT_MS)
    }

    if (isLoggedIn() && isChatbotSessionExpired()) {
      logoutInactiveUser()
      clearInactivityTimer()
      return clearInactivityTimer
    }

    if (!isAuthenticated || !isLoggedIn()) {
      clearInactivityTimer()
      return clearInactivityTimer
    }

    const activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart', 'focus']

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetInactivityTimer, { passive: true })
    })
    resetInactivityTimer()

    return () => {
      clearInactivityTimer()
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetInactivityTimer)
      })
    }
  }, [isAuthenticated])

  useEffect(() => {
    const syncAuthState = () => {
      const nextIsAuthenticated = isLoggedIn()
      const nextUser = nextIsAuthenticated ? getStoredUser() || getStoredTokenPayload() || null : null

      if (nextIsAuthenticated && isChatbotSessionExpired()) {
        clearChatbotSessionState()
        setIsAuthenticated(false)
        setCurrentUser(null)
        setIsLoginModalOpen(false)
        setLoginError('')
        return
      }

      if (nextIsAuthenticated) {
        localStorage.removeItem(guestMessageCountKey)
        setLastActivityAt(getLastActivityAt() || Date.now())
        setIsLoginModalOpen(false)
        setLoginError('')
      }

      setIsAuthenticated(nextIsAuthenticated)
      // Keep the same object when the stored user hasn't changed. A new object on
      // every window focus re-triggered the history loader and wiped the open chat.
      setCurrentUser((previousUser) => (
        JSON.stringify(previousUser) === JSON.stringify(nextUser) ? previousUser : nextUser
      ))
    }

    window.addEventListener('storage', syncAuthState)
    window.addEventListener('focus', syncAuthState)
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, syncAuthState)
    syncAuthState()

    return () => {
      window.removeEventListener('storage', syncAuthState)
      window.removeEventListener('focus', syncAuthState)
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, syncAuthState)
    }
  }, [])

  useEffect(() => {
    const stream = chatStreamRef.current

    if (!stream) {
      return
    }

    window.requestAnimationFrame(() => {
      stream.scrollTop = stream.scrollHeight
      window.requestAnimationFrame(() => {
        stream.scrollTop = stream.scrollHeight
      })
    })
  }, [activeThread?.messages.length, isTyping])

  // Follow the answer as it types, unless the user has scrolled up to read something else.
  function keepStreamPinnedToBottom() {
    const stream = chatStreamRef.current

    if (!stream) {
      return
    }

    const distanceFromBottom = stream.scrollHeight - stream.scrollTop - stream.clientHeight

    if (distanceFromBottom < 160) {
      stream.scrollTop = stream.scrollHeight
    }
  }

  function updateThread(threadId, updater) {
    setChatThreads((currentThreads) =>
      currentThreads.map((thread) => {
        if (thread.id !== threadId) {
          return thread
        }

        return updater(thread)
      }),
    )
  }

  function stopTypingTimer() {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current)
      typingTimerRef.current = null
    }
  }

  function getNextActivityOrder() {
    activityCounterRef.current += 1
    return activityCounterRef.current
  }

  function buildApiAssistantReply(data) {
    const sourcePreviewImages = (data.sources || [])
      .filter((source) => source.documentId || source.previewFileUrl)
      .map((source) => ({
        documentId: source.documentId,
        title: source.title,
        pageNumber: source.pageNumber,
        printedPageNumber: source.printedPageNumber,
        pageLabel: source.pageLabel,
        url: source.previewFileUrl || `/api/documents/${source.documentId}/preview-file`,
        previewType: source.previewType || 'pdf_page',
      }))
    const previewImages = sourcePreviewImages.length ? sourcePreviewImages : data.images || []
    const sourceText = data.sources?.length
      ? data.sources
        .slice(0, 3)
        .map((source) => `${source.title}, page ${source.pageLabel || source.printedPageNumber || source.pageNumber}`)
        .join('; ')
      : 'MCU Knowledge Base'
    const extraSourceCount = data.sources?.length > 3 ? data.sources.length - 3 : 0

    return {
      author: ASSISTANT_NAME,
      role: 'assistant',
      text: data.answer || 'I found a response, but it did not include answer text.',
      blocks: data.answerBlocks,
      images: previewImages,
      showImages: previewImages.length > 0,
      time: getCurrentTime(),
      source: extraSourceCount > 0 ? `${sourceText}; +${extraSourceCount} more` : sourceText,
    }
  }

  function buildConversationContext(thread) {
    return (thread?.messages || [])
      .filter((messageItem) => ['user', 'assistant'].includes(messageItem.role))
      .filter((messageItem) => messageItem.text && !isDefaultAssistantGreeting(messageItem.text))
      .slice(-6)
      .map((messageItem) => ({
        role: messageItem.role,
        text: messageItem.text,
      }))
  }

  function getLatestSourceMessage() {
    return [...activeThread.messages]
      .reverse()
      .find((messageItem) => messageItem.role === 'assistant' && messageItem.images?.length > 0)
  }

  function buildErrorReply(errorMessage) {
    return {
      author: ASSISTANT_NAME,
      role: 'assistant',
      text: errorMessage || 'I cannot connect to the official knowledge base right now. Please try again later or contact the appropriate university office for confirmation.',
      time: getCurrentTime(),
      source: 'MCU Knowledge Base unavailable',
    }
  }

  function openLoginModal() {
    setLoginError('')
    setIsLoginModalOpen(true)
  }

  function closeLoginModal() {
    if (!isMicrosoftSigningIn) {
      setIsLoginModalOpen(false)
      setLoginError('')
    }
  }

  function handleMicrosoftSignIn() {
    setLoginError('')
    setIsMicrosoftSigningIn(true)

    const returnPath = `${window.location.pathname}${window.location.search}`
    sessionStorage.setItem(MICROSOFT_RETURN_PATH_KEY, returnPath)
    navigate(`/login?ms365=1&returnTo=${encodeURIComponent(returnPath)}`)
  }

  async function submitQuestion(question) {
    const trimmedQuestion = question.trim()

    if (!trimmedQuestion || !activeThread || submitLockRef.current || isTyping) {
      return
    }

    submitLockRef.current = true

    if (isLoggedIn() && !isAuthenticated) {
      setIsAuthenticated(true)
      localStorage.removeItem(guestMessageCountKey)
    }

    stopTypingTimer()

    const submittedAt = getNextActivityOrder()
    const userMessage = {
      author: currentUser?.name || currentUser?.email || 'User',
      role: 'user',
      text: trimmedQuestion,
      time: getCurrentTime(),
      createdAt: submittedAt,
    }

    updateThread(activeThread.id, (thread) => ({
      ...thread,
      updatedAt: 'Just now',
      lastActivityAt: submittedAt,
      title: ['New chat', 'New conversation'].includes(thread.title) ? trimmedQuestion.slice(0, 32) : thread.title,
      topic: getMessagePreview(trimmedQuestion),
      messages: [...thread.messages, userMessage],
    }))

    setMessage('')
    setIsTyping(true)

    if (isFollowUpScreenshotRequest(trimmedQuestion)) {
      const sourceMessage = getLatestSourceMessage()
      const sourceImages = sourceMessage?.images || []

      const assistantReply = {
        author: ASSISTANT_NAME,
        role: 'assistant',
        text: sourceImages.length > 0
          ? sourceMessage.text
          : 'I do not have source screenshots available from the previous answer. Ask about a specific topic first, then request the source page.',
        blocks: sourceImages.length > 0 ? sourceMessage.blocks : undefined,
        time: getCurrentTime(),
        images: sourceImages,
        showImages: sourceImages.length > 0,
      }

      updateThread(activeThread.id, (thread) => ({
        ...thread,
        messages: [...thread.messages, assistantReply],
      }))
      setIsTyping(false)
      submitLockRef.current = false
      return
    }

    const threadId = activeThread.id
    const replyId = `reply-${threadId}-${submittedAt}`
    let hasStreamedText = false

    try {
      const conversationContext = buildConversationContext(activeThread)
      const data = await askChatbotStream(
        {
          message: trimmedQuestion,
          scope: siteScope,
          embedOrigin,
          embedToken,
          isEmbed: isEmbedMode,
          conversationContext,
        },
        {
          // The AI's answer arrives in pieces: show each piece as soon as it lands.
          onPartial: (answerBlocks) => {
            if (!answerBlocks?.length) {
              return
            }

            if (!hasStreamedText) {
              hasStreamedText = true
              setStreamingReplyId(replyId)
            }

            upsertReply(threadId, {
              author: ASSISTANT_NAME,
              role: 'assistant',
              text: '',
              blocks: answerBlocks,
              time: getCurrentTime(),
              replyId,
            })
            window.requestAnimationFrame(keepStreamPinnedToBottom)
          },
        },
      )

      // Answers that were not streamed (e.g. straight from the documents) still type out.
      if (!hasStreamedText) {
        setAnimatingReplyId(replyId)
      }

      upsertReply(threadId, { ...buildApiAssistantReply(data), replyId })
    } catch (error) {
      upsertReply(threadId, { ...buildErrorReply(error.message), replyId })
    } finally {
      setStreamingReplyId('')
      setIsTyping(false)
      submitLockRef.current = false
    }
  }

  // Adds the reply to the thread, or replaces it if an earlier piece is already shown.
  function upsertReply(threadId, reply) {
    updateThread(threadId, (thread) => {
      const existingIndex = thread.messages.findIndex((messageItem) => messageItem.replyId === reply.replyId)

      return {
        ...thread,
        messages: existingIndex === -1
          ? [...thread.messages, reply]
          : thread.messages.map((messageItem, index) => (index === existingIndex ? reply : messageItem)),
      }
    })
  }

  function handleSendMessage(event) {
    event.preventDefault()
    setIsSuggestionOpen(false)
    setActiveSuggestionIndex(-1)
    submitQuestion(message)
  }

  function handleSuggestionSelect(suggestion) {
    setIsSuggestionOpen(false)
    setActiveSuggestionIndex(-1)
    submitQuestion(suggestion)
  }

  function handleComposerKeyDown(event) {
    if (!isSuggestionOpen || visibleSmartSuggestions.length === 0) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveSuggestionIndex((current) => (
        current < 0 ? 0 : (current + 1) % visibleSmartSuggestions.length
      ))
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveSuggestionIndex((current) => (
        current < 0 || current === 0 ? visibleSmartSuggestions.length - 1 : current - 1
      ))
    }

    if (event.key === 'Enter' && activeSuggestionIndex >= 0 && visibleSmartSuggestions[activeSuggestionIndex]) {
      event.preventDefault()
      if (!isTyping && !submitLockRef.current) {
        handleSuggestionSelect(visibleSmartSuggestions[activeSuggestionIndex])
      }
    }

    if (event.key === 'Escape') {
      setIsSuggestionOpen(false)
      setActiveSuggestionIndex(-1)
    }
  }

  function handleThreadSelect(threadId) {
    stopTypingTimer()
    setIsTyping(false)
    setActiveThreadId(threadId)
    setMessage('')
  }

  function scrollToThreadMessage(threadId, messageIndex) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document
          .getElementById(`chat-message-${threadId}-${messageIndex}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    })
  }

  function handleRecentConversationSelect(conversation) {
    const messageKey = `${conversation.threadId}-${conversation.messageIndex}`

    handleThreadSelect(conversation.threadId)
    setOpenRecentMenuId('')
    setHighlightedMessageKey(messageKey)

    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current)
    }

    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedMessageKey('')
      highlightTimerRef.current = null
    }, 2200)

    scrollToThreadMessage(conversation.threadId, conversation.messageIndex)
  }

  function handleDeleteRecentConversation(conversation) {
    const shouldResetActiveThread = conversation.threadId === activeThreadId
    const freshThread = shouldResetActiveThread ? createEmptyChatThread(`chat-${getNextActivityOrder()}`) : null

    stopTypingTimer()
    setIsTyping(false)
    setOpenRecentMenuId('')
    setHighlightedMessageKey('')
    setChatThreads((currentThreads) => {
      const remainingThreads = currentThreads.filter((thread) => thread.id !== conversation.threadId)

      return freshThread
        ? [freshThread, ...remainingThreads.filter((thread) => !isUnsavedEmptyThread(thread))]
        : remainingThreads
    })

    if (freshThread) {
      setActiveThreadId(freshThread.id)
      setMessage('')
    }
  }

  function handleNewChat() {
    const createdAt = getNextActivityOrder()
    const id = `chat-${createdAt}`

    setChatThreads((currentThreads) => [
      createEmptyChatThread(id),
      ...currentThreads,
    ])
    setActiveThreadId(id)
    setMessage('')
  }

  async function loadLibraryDocuments() {
    setIsLibraryLoading(true)
    setLibraryError('')

    try {
      const data = await apiFetch('/api/documents/library')
      setLibraryDocuments((data.documents || []).map((document) => ({
        ...document,
        type: getLibraryFileType(document.filePath),
        uploadedDate: formatLibraryDate(document.createdAt),
      })))
    } catch (error) {
      setLibraryError(error.message || 'Unable to load the Library.')
    } finally {
      setIsLibraryLoading(false)
    }
  }

  function handleLibrarySelect() {
    setIsLibraryOpen(true)

    if (libraryDocuments.length === 0 && !isLibraryLoading) {
      loadLibraryDocuments()
    }
  }

  function closeLibrary() {
    setIsLibraryOpen(false)
    setLibrarySearch('')
    setSelectedLibraryDocument(null)
    setIsLibraryPreviewLoading(false)
    setLibraryPreviewError('')
  }

  async function handleViewLibraryDocument(document) {
    setSelectedLibraryDocument(document)
    setIsLibraryPreviewLoading(true)
    setLibraryPreviewError('')

    try {
      const data = await apiFetch(`/api/documents/library/${document.id}/preview`)
      setSelectedLibraryDocument({
        ...document,
        previewFileUrl: data.previewFileUrl,
        originalFileUrl: data.originalFileUrl || document.fileUrl,
      })
    } catch (error) {
      setLibraryPreviewError(error.message || 'Unable to preview this file.')
    } finally {
      setIsLibraryPreviewLoading(false)
    }
  }

  function closeLibraryPreview() {
    setSelectedLibraryDocument(null)
    setLibraryPreviewError('')
    setIsLibraryPreviewLoading(false)
  }

  function handleChatbotLogout() {
    clearChatbotSessionState()
    setIsAuthenticated(false)
    setCurrentUser(null)
    setIsLoginModalOpen(false)
    setIsMicrosoftSigningIn(false)
    setLoginError('')
    setToastMessage('You have been logged out.')
  }

  return (
    <main className={`mcu-kb-shell ${isEmbedMode ? 'is-embed' : ''} ${isCompactEmbedMode ? 'is-compact-embed' : ''} ${requiresSsoLogin ? 'is-sso-required' : ''} ${!isEmbedMode && !hasConversationStarted ? 'is-empty-chat' : ''}`}>
      {toastMessage && (
        <div className="mcu-kb-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
      {!isEmbedMode && !requiresSsoLogin && (
      <header className="mcu-kb-header">
        <div className="mcu-kb-brand">
          <span className="mcu-kb-main-logo" aria-hidden="true">
            <img src={mcuMainLogo} alt="" />
          </span>
          <div>
            <strong>Manila Central University</strong>
            <small>Centralino Virtual Assistant</small>
          </div>
        </div>
        {!hasAuthenticatedSession && (
          <div className="mcu-kb-header-actions">
            <button type="button" onClick={openLoginModal}>Login</button>
          </div>
        )}
      </header>
      )}

      <section className="mcu-kb-layout">
        {!isEmbedMode && !requiresSsoLogin && (
        <aside className="mcu-kb-insights" aria-label="Conversation context">
          <nav className="mcu-kb-sidebar-actions" aria-label="Chat actions">
            <button type="button" onClick={handleNewChat}>
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M12 5H7a4 4 0 0 0-4 4v8a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-5" />
                <path d="M16 3h5v5" />
                <path d="M10 14 21 3" />
              </svg>
              <span>New chat</span>
            </button>
            <button type="button" onClick={handleLibrarySelect}>
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" />
                <path d="M8 2v15" />
              </svg>
              <span>Library</span>
            </button>
          </nav>
          <section className="mcu-kb-recent-panel" ref={recentPanelRef}>
            <p>Recents</p>
            {recentConversations.length === 0 && (
              <small>No recent questions yet.</small>
            )}
            <div className="mcu-kb-recent-scroll">
              {recentConversations.map((conversation) => (
                <div
                  className={`mcu-kb-recent-item ${conversation.threadId === activeThread.id ? 'active' : ''} ${openRecentMenuId === conversation.id ? 'is-menu-open' : ''}`}
                  key={conversation.id}
                >
                  <button
                    className="mcu-kb-recent-title"
                    type="button"
                    onClick={() => handleRecentConversationSelect(conversation)}
                  >
                    <strong>{conversation.title}</strong>
                  </button>
                  <button
                    className="mcu-kb-recent-menu-button"
                    type="button"
                    aria-label={`Conversation options for ${conversation.title}`}
                    aria-expanded={openRecentMenuId === conversation.id}
                    onClick={(event) => {
                      event.stopPropagation()
                      setOpenRecentMenuId((currentId) => currentId === conversation.id ? '' : conversation.id)
                    }}
                  >
                    <span aria-hidden="true"></span>
                    <span aria-hidden="true"></span>
                    <span aria-hidden="true"></span>
                  </button>
                  {openRecentMenuId === conversation.id && (
                    <div
                      className="mcu-kb-recent-menu"
                      role="menu"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        className="mcu-kb-recent-delete"
                        type="button"
                        role="menuitem"
                        onClick={() => handleDeleteRecentConversation(conversation)}
                      >
                        <svg aria-hidden="true" viewBox="0 0 24 24">
                          <path d="M3 6h18" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                        </svg>
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
          <nav className="mcu-kb-sidebar-links" aria-label="MCU links">
            <a href="https://mcu.edu.ph/" target="_blank" rel="noreferrer">
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M14 3h7v7" />
                <path d="M10 14 21 3" />
                <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
              </svg>
              <span>MCU Official</span>
            </a>
            <a href="https://myportal.mcu.edu.ph/Student/Login.php" target="_blank" rel="noreferrer">
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" />
                <path d="M8 7h8" />
                <path d="M8 11h8" />
              </svg>
              <span>Student Portal</span>
            </a>
            <a href="https://office.com/" target="_blank" rel="noreferrer">
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M12 3v18" />
                <path d="M3 12h18" />
              </svg>
              <span>Office 365</span>
            </a>
            <a href="https://kb.mcu.edu.ph/" target="_blank" rel="noreferrer"s>
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                <path d="M8 9h8" />
                <path d="M8 13h5" />
              </svg>
              <span>MCU Knowledge Base</span>
            </a>
          </nav>
          <section className="mcu-kb-sidebar-profile" aria-label="Signed-in profile">
            <div className="mcu-kb-sidebar-profile-main">
              <span className={`mcu-kb-sidebar-avatar ${headerPhotoUrl ? 'has-photo' : ''}`} aria-hidden="true">
                {headerPhotoUrl ? (
                  <img
                    src={headerPhotoUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={() => setBrokenHeaderPhotoUrl(headerPhotoUrl)}
                  />
                ) : (
                  headerInitials
                )}
              </span>
              <div>
                <strong>{headerDisplayName}</strong>
                <small>{currentUser?.email || 'Microsoft 365 account'}</small>
              </div>
            </div>
            <button className="mcu-kb-sidebar-logout" type="button" onClick={handleChatbotLogout}>
              Logout
            </button>
          </section>
        </aside>
        )}

        <section className="mcu-kb-chat" aria-label={`Chat with ${ASSISTANT_NAME}`}>
          {isCompactEmbedMode && (
            <header className="mcu-kb-embed-header">
              <button type="button" aria-label="Back">&lsaquo;</button>
              <span aria-hidden="true"><img src={mcuLogoCircle} alt="" /></span>
              <div>
                <strong>{ASSISTANT_NAME}</strong>
                <small>I am here to assist you!</small>
              </div>
            </header>
          )}

          <>

          {requiresSsoLogin ? (
            <section className="mcu-sso-gate" aria-labelledby="mcu-sso-gate-title">
              <div className="mcu-sso-card">
                <div className="mcu-sso-card-mark" aria-hidden="true">
                  <img src={mcuSmallLogo} alt="" />
                </div>
                <p>Centralino Virtual Assistant</p>
                <h1 id="mcu-sso-gate-title">Sign in to start chatting</h1>
                <span>
                  Use your authorized MCU Microsoft 365 account to access the university knowledge assistant.
                </span>
                {loginError && <strong className="mcu-sso-error">{loginError}</strong>}
                <button
                  className="mcu-sso-button"
                  type="button"
                  onClick={handleMicrosoftSignIn}
                  disabled={isMicrosoftSigningIn}
                >
                  <span className="microsoft-mark" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                  {isMicrosoftSigningIn ? 'Opening Microsoft 365...' : 'Continue with Microsoft 365'}
                </button>
                <small>Secure SSO access for MCU users</small>
              </div>
            </section>
          ) : (
          <>
          {!isEmbedMode && !hasConversationStarted && (
            <div className="mcu-kb-empty-title">
              Hello! I am Centralino Virtual Assistant. How can I help you today?
            </div>
          )}
          <div className="mcu-kb-stream" ref={chatStreamRef}>
            {activeThread.messages.map((messageItem, index) => (
              <div
                className={highlightedMessageKey === `${activeThread.id}-${index}` ? 'chat-message-jump-highlight' : undefined}
                id={`chat-message-${activeThread.id}-${index}`}
                key={`${messageItem.author}-${messageItem.time}-${index}`}
              >
                <MessageBubble
                  message={messageItem}
                  currentUser={currentUser}
                  animate={Boolean(animatingReplyId) && messageItem.replyId === animatingReplyId}
                  isStreaming={Boolean(streamingReplyId) && messageItem.replyId === streamingReplyId}
                  onTypingProgress={keepStreamPinnedToBottom}
                  onTypingDone={() => setAnimatingReplyId('')}
                />
              </div>
            ))}
            {isTyping && !streamingReplyId && (
              <div className="typing-row" aria-live="polite">
                <div className="avatar" aria-hidden="true"><img src={mcuLogoCircle} alt="" /></div>
                <div className="bubble typing-bubble">
                  <div className="message-meta">
                    <strong>{ASSISTANT_NAME}</strong>
                    <span>typing...</span>
                  </div>
                  <div className="typing-dots" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} aria-hidden="true"></div>
          </div>

          <form className="mcu-kb-composer" onSubmit={handleSendMessage}>
            <div className="mcu-kb-input-wrap">
              {isSuggestionOpen && visibleSmartSuggestions.length > 0 && (
                <div className="mcu-smart-suggestions" role="listbox" aria-label="Suggested questions">
                  {visibleSmartSuggestions.map((suggestion, index) => (
                    <button
                      className={index === activeSuggestionIndex ? 'active' : ''}
                      type="button"
                      disabled={isTyping}
                      role="option"
                      aria-selected={index === activeSuggestionIndex}
                      key={suggestion}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSuggestionSelect(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              {!message && (
                <span className="mcu-typewriter-placeholder" aria-hidden="true">
                  {placeholderText || 'Start typing your question...'}
                </span>
              )}
              <input
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value)
                  setIsSuggestionOpen(true)
                  setActiveSuggestionIndex(-1)
                }}
                onFocus={() => setIsSuggestionOpen(true)}
                onBlur={() => window.setTimeout(() => {
                  setIsSuggestionOpen(false)
                  setActiveSuggestionIndex(-1)
                }, 120)}
                onKeyDown={handleComposerKeyDown}
                placeholder=""
                maxLength={2000}
                aria-autocomplete="list"
                aria-expanded={isSuggestionOpen && visibleSmartSuggestions.length > 0}
              />
            </div>
            <button type="submit" disabled={!message.trim() || isTyping}>Send</button>
          </form>
          </>
          )}
          {isLibraryOpen && (
            <div className="mcu-library-backdrop" role="presentation" onMouseDown={closeLibrary}>
              <section
                className="mcu-library-modal"
                aria-labelledby="mcu-library-title"
                aria-modal="true"
                role="dialog"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <header>
                  <div>
                    <p>Library</p>
                    <h2 id="mcu-library-title">Uploaded knowledge files</h2>
                  </div>
                  <button type="button" aria-label="Close Library" onClick={closeLibrary}>
                    &times;
                  </button>
                </header>
                <div className="mcu-library-toolbar">
                  <label>
                    <span>Search files</span>
                    <input
                      value={librarySearch}
                      onChange={(event) => setLibrarySearch(event.target.value)}
                      placeholder="Search uploaded documents..."
                    />
                  </label>
                  <button type="button" onClick={loadLibraryDocuments} disabled={isLibraryLoading}>
                    {isLibraryLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
                {libraryError && <p className="mcu-library-error">{libraryError}</p>}
                <div className={`mcu-library-body ${selectedLibraryDocument ? 'has-preview' : ''}`}>
                  <div className="mcu-library-list" role="list">
                    {isLibraryLoading && libraryDocuments.length === 0 && (
                      <p className="mcu-library-empty">Loading uploaded files...</p>
                    )}
                    {!isLibraryLoading && filteredLibraryDocuments.length === 0 && (
                      <p className="mcu-library-empty">No uploaded files found.</p>
                    )}
                    {filteredLibraryDocuments.map((document) => (
                      <article className={`mcu-library-file ${selectedLibraryDocument?.id === document.id ? 'active' : ''}`} role="listitem" key={document.id}>
                        <span className="mcu-library-file-icon" aria-hidden="true">
                          {document.type}
                        </span>
                        <div>
                          <h3>{document.title}</h3>
                          <p>
                            <span>{document.uploadedDate}</span>
                            <span>{document.siteScope || 'general'}</span>
                            <span>{document.imageCount} images</span>
                          </p>
                        </div>
                        <button type="button" onClick={() => handleViewLibraryDocument(document)}>
                          View
                        </button>
                      </article>
                    ))}
                  </div>
                  {selectedLibraryDocument && (
                    <section className="mcu-library-preview" aria-label="Document preview">
                      <header>
                        <div>
                          <p>Document preview</p>
                          <h3>{selectedLibraryDocument.title}</h3>
                          <span>
                            {selectedLibraryDocument.type} - {selectedLibraryDocument.uploadedDate} - {selectedLibraryDocument.siteScope || 'general'}
                          </span>
                        </div>
                        <button type="button" aria-label="Close document preview" onClick={closeLibraryPreview}>
                          &times;
                        </button>
                      </header>
                      <div className="mcu-library-original-preview">
                        {isLibraryPreviewLoading ? (
                          <p className="mcu-library-empty">Preparing document preview...</p>
                        ) : libraryPreviewError ? (
                          <p className="mcu-library-empty">{libraryPreviewError}</p>
                        ) : selectedLibraryDocument.previewFileUrl ? (
                          <>
                            <iframe
                              title={`${selectedLibraryDocument.title} file preview`}
                              src={`${getLibraryAssetUrl(selectedLibraryDocument.previewFileUrl)}#zoom=125&view=FitH`}
                            />
                            {['DOC', 'DOCX'].includes(selectedLibraryDocument.type) && (
                              <p>
                                Preview generated from the uploaded Word file.
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="mcu-library-empty">Preview is not available for this file.</p>
                        )}
                      </div>
                    </section>
                  )}
                </div>
              </section>
            </div>
          )}
          {isLoginModalOpen && (
            <div className="mcu-login-modal-backdrop" role="presentation" onMouseDown={closeLoginModal}>
              <section
                className="mcu-login-modal"
                aria-labelledby="mcu-login-modal-title"
                aria-modal="true"
                role="dialog"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <button className="mcu-login-modal-close" type="button" aria-label="Close login modal" onClick={closeLoginModal}>
                  &times;
                </button>
                <div className="mcu-login-modal-brand">
                  <img src={mcuSmallLogo} alt="" />
                  <div>
                    <p>Centralino Virtual Assistant</p>
                    <h2 id="mcu-login-modal-title">Continue with Microsoft 365</h2>
                  </div>
                </div>
                <p className="mcu-login-modal-copy">
                  Sign in with your authorized MCU Microsoft 365 account to continue chatting.
                </p>
                {loginError && <p className="mcu-login-modal-error">{loginError}</p>}
                <button
                  className="mcu-login-modal-ms365"
                  type="button"
                  onClick={handleMicrosoftSignIn}
                  disabled={isMicrosoftSigningIn}
                >
                  <span className="microsoft-mark" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                  {isMicrosoftSigningIn ? 'Opening Microsoft 365...' : 'Login with Microsoft 365'}
                </button>
              </section>
            </div>
          )}
          </>
        </section>

      </section>
    </main>
  )
}

export default Chatbot

