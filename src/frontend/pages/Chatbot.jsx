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
import MessageBubble from '../components/MessageBubble'
import { askChatbot } from '../services/chatService'
import {
  buildRecentConversations,
  buildSmartSuggestions,
  defaultAssistantGreeting,
  getCurrentTime,
  getEmbedOrigin,
  getMessagePreview,
  initialThreads,
  isDefaultAssistantGreeting,
  isFollowUpScreenshotRequest,
  isScreenshotRequest,
} from '../utils/chatbotUtils'

const AUTH_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000
const AUTH_MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000
const guestMessageCountKey = 'mcuGuestMessageCount'
const AUTH_LAST_ACTIVITY_KEY = 'mcuChatbotLastActivityAt'
const AUTH_SESSION_CREATED_KEY = 'mcuChatbotSessionCreatedAt'
const MICROSOFT_RETURN_PATH_KEY = 'mcuMicrosoftReturnPath'
const CHATBOT_LOGIN_TOAST_KEY = 'mcuChatbotLoginToast'
const animatedPlaceholderPrompt = 'Start typing your question...'
const ASSISTANT_NAME = 'Centralino Bot'

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
  const [placeholderCharIndex, setPlaceholderCharIndex] = useState(0)
  const [isPlaceholderDeleting, setIsPlaceholderDeleting] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const typingTimerRef = useRef(null)
  const highlightTimerRef = useRef(null)
  const inactivityTimerRef = useRef(null)
  const submitLockRef = useRef(false)
  const bottomRef = useRef(null)
  const chatStreamRef = useRef(null)
  const activityCounterRef = useRef(initialThreads.length)
  const toastTimerRef = useRef(null)

  const activeThread = useMemo(
    () => chatThreads.find((thread) => thread.id === activeThreadId) ?? chatThreads[0],
    [activeThreadId, chatThreads],
  )
  const recentConversations = buildRecentConversations(chatThreads)
  const smartSuggestions = useMemo(
    () => buildSmartSuggestions(message, []),
    [message],
  )
  const visibleSmartSuggestions = isCompactEmbedMode ? smartSuggestions.slice(0, 3) : smartSuggestions
  const hasAuthenticatedSession = isAuthenticated || isLoggedIn()
  const hasConversationStarted = activeThread?.messages.some((messageItem) => messageItem.role === 'user') || isTyping
  const headerDisplayName = currentUser?.name || currentUser?.email || 'Student'
  const headerPhotoUrl = currentUser?.photoUrl && currentUser.photoUrl !== brokenHeaderPhotoUrl ? currentUser.photoUrl : ''
  const headerInitials = getInitials(currentUser?.name, currentUser?.email)
  const placeholderText = animatedPlaceholderPrompt.slice(0, placeholderCharIndex)

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
      setCurrentUser(nextUser)
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
      images: data.images || [],
      showImages: isScreenshotRequest(data.question || ''),
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
      author: 'Student',
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

    try {
      const conversationContext = buildConversationContext(activeThread)
      const data = await askChatbot(
        trimmedQuestion,
        siteScope,
        embedOrigin,
        embedToken,
        isEmbedMode,
        conversationContext,
      )
      const assistantReply = buildApiAssistantReply(data)

      updateThread(activeThread.id, (thread) => ({
        ...thread,
        messages: [...thread.messages, assistantReply],
      }))
    } catch (error) {
      const assistantReply = buildErrorReply(error.message)

      updateThread(activeThread.id, (thread) => ({
        ...thread,
        messages: [...thread.messages, assistantReply],
      }))
    } finally {
      setIsTyping(false)
      submitLockRef.current = false
    }
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

  function handleNewChat() {
    const createdAt = getNextActivityOrder()
    const id = `chat-${createdAt}`

    setChatThreads((currentThreads) => [
      {
        id,
        title: 'New chat',
        topic: 'General',
        updatedAt: 'Just now',
        messages: [
          {
            author: ASSISTANT_NAME,
            role: 'assistant',
            text: defaultAssistantGreeting,
            time: getCurrentTime(),
            source: 'MCU Knowledge Base',
          },
        ],
        lastActivityAt: createdAt,
      },
      ...currentThreads,
    ])
    setActiveThreadId(id)
    setMessage('')
  }

  return (
    <main className={`mcu-kb-shell ${isEmbedMode ? 'is-embed' : ''} ${isCompactEmbedMode ? 'is-compact-embed' : ''} ${!isEmbedMode && !hasConversationStarted ? 'is-empty-chat' : ''}`}>
      {toastMessage && (
        <div className="mcu-kb-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
      {!isEmbedMode && (
      <header className="mcu-kb-header">
        <div className="mcu-kb-brand">
          <span className="mcu-kb-main-logo" aria-hidden="true">
            <img src={mcuMainLogo} alt="" />
          </span>
          <div>
            <strong>Manila Central University</strong>
            <small>Centralino Bot</small>
          </div>
        </div>
        <div className="mcu-kb-header-actions">
          {hasAuthenticatedSession ? (
            <div className="mcu-kb-user-chip" aria-label={`Signed in as ${headerDisplayName}`}>
              <span className={`mcu-kb-user-avatar ${headerPhotoUrl ? 'has-photo' : ''}`} aria-hidden="true">
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
              <span className="mcu-kb-user-name">{headerDisplayName}</span>
            </div>
          ) : (
            <button type="button" onClick={openLoginModal}>Login</button>
          )}
          <button type="button" onClick={handleNewChat}>New Chat</button>
        </div>
      </header>
      )}

      <section className="mcu-kb-layout">
        {!isEmbedMode && (
        <aside className="mcu-kb-insights" aria-label="Conversation context">
          <section>
            <p>Current Session</p>
            <h2>{activeThread.title}</h2>
            <span>{activeThread.messages.length} messages</span>
          </section>
          <section>
            <p>Recent Conversations</p>
            {recentConversations.length === 0 && (
              <small>No recent questions yet.</small>
            )}
            {recentConversations.slice(0, 5).map((conversation) => (
              <button
                className={conversation.threadId === activeThread.id ? 'active' : ''}
                type="button"
                key={conversation.id}
                onClick={() => handleRecentConversationSelect(conversation)}
              >
                <strong>{conversation.title}</strong>
                <span>{conversation.preview}</span>
              </button>
            ))}
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

          {!isEmbedMode && (
          <div className="mcu-kb-hero">
            <div>
              <h1>Welcome to MCU Knowledge Base</h1>
            </div>
          </div>
          )}

          <div className="mcu-kb-stream" ref={chatStreamRef}>
            {activeThread.messages.map((messageItem, index) => (
              <div
                className={highlightedMessageKey === `${activeThread.id}-${index}` ? 'chat-message-jump-highlight' : undefined}
                id={`chat-message-${activeThread.id}-${index}`}
                key={`${messageItem.author}-${messageItem.time}-${index}`}
              >
                <MessageBubble message={messageItem} currentUser={currentUser} />
              </div>
            ))}
            {isTyping && (
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
                    <p>Centralino Bot</p>
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

