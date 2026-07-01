import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import MessageBubble from '../components/MessageBubble'
import { askChatbot, fetchChatbotTopics } from '../services/chatService'

const topicGroups = [
  {
    label: 'Academics',
    items: [
      { icon: 'A', label: 'Academic Programs', prompt: 'Tell me about academic programs.' },
      { icon: 'C', label: 'Academic Calendar', prompt: 'What is the academic calendar?' },
    ],
  },
  {
    label: 'Services',
    items: [
      { icon: 'L', label: 'Library Hours', prompt: 'What are the library hours?' },
      { icon: 'M', label: 'Campus Map', prompt: 'Where can I find the campus map?' },
      { icon: 'H', label: 'Housing', prompt: 'Tell me about housing services.' },
    ],
  },
  {
    label: 'Student Life',
    items: [
      { icon: 'S', label: 'Student Organizations', prompt: 'Tell me about student organizations.' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { icon: '$', label: 'Tuition & Fees', prompt: 'Where can I find tuition and fees information?' },
    ],
  },
  {
    label: 'Admissions',
    items: [
      { icon: '?', label: 'Admissions', prompt: 'What admissions information should I know?' },
    ],
  },
]

const initialThreads = [
  {
    id: 'welcome',
    title: 'New conversation',
    topic: 'General',
    updatedAt: 'Just now',
    messages: [
      {
        author: 'MCU Guide',
        role: 'assistant',
        text: '🎓 Welcome to the MCU Knowledge Assistant!',
        time: getCurrentTime(),
        source: 'MCU Knowledge Base',
      },
    ],
  },
]

function getCurrentTime() {
  return new Date().toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getMessagePreview(text) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim()
  return normalized.length > 54 ? `${normalized.slice(0, 54)}...` : normalized
}

function isScreenshotRequest(question) {
  return /\b(screenshot|screenshots|screen shot|screen shots|image|images|picture|pictures|photo|photos|visual|show me|source page|source pages|page image|page images|pdf page|pdf pages)\b/i.test(question)
}

function isFollowUpScreenshotRequest(question) {
  const remainingText = question
    .toLowerCase()
    .replace(/\b(can|could|you|please|give|send|show|me|the|a|an|of|or|and|for|source|page|pdf|image|images|picture|photo|screenshot|screen shot|visual|more|explain|explanation|details|detailed|with)\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return isScreenshotRequest(question) && remainingText.length === 0
}

function getEmbedOrigin(isEmbedMode, explicitEmbedOrigin) {
  if (explicitEmbedOrigin) {
    try {
      return new URL(explicitEmbedOrigin).origin
    } catch {
      return explicitEmbedOrigin
    }
  }

  if (!isEmbedMode) {
    return window.location.origin
  }

  try {
    return document.referrer ? new URL(document.referrer).origin : window.location.origin
  } catch {
    return window.location.origin
  }
}

function buildRecentConversations(chatThreads) {
  const recentQuestions = chatThreads.flatMap((thread) =>
    thread.messages
      .map((messageItem, index) => {
        if (messageItem.role !== 'user') {
          return null
        }

        const nextAssistantMessage = thread.messages
          .slice(index + 1)
          .find((nextMessage) => nextMessage.role === 'assistant')

        return {
          id: `${thread.id}-${index}`,
          threadId: thread.id,
          title: getMessagePreview(messageItem.text),
          preview: getMessagePreview(nextAssistantMessage?.text || thread.topic),
          sortTime: messageItem.createdAt || thread.lastActivityAt || 0,
        }
      })
      .filter(Boolean),
  )

  if (recentQuestions.length > 0) {
    return [...recentQuestions].sort((a, b) => b.sortTime - a.sortTime)
  }

  return []
}

function Chatbot() {
  const [searchParams] = useSearchParams()
  const isEmbedMode = searchParams.get('embed') === '1'
  const isCompactEmbedMode = isEmbedMode && searchParams.get('compact') === '1'
  const siteScope = searchParams.get('scope') || 'general'
  const explicitEmbedOrigin = searchParams.get('embedOrigin')
  const embedOrigin = useMemo(
    () => getEmbedOrigin(isEmbedMode, explicitEmbedOrigin),
    [explicitEmbedOrigin, isEmbedMode],
  )
  const [message, setMessage] = useState('')
  const [knowledgeTopics, setKnowledgeTopics] = useState(topicGroups)
  const [chatThreads, setChatThreads] = useState(initialThreads)
  const [activeThreadId, setActiveThreadId] = useState(initialThreads[0].id)
  const [isEmbedAuthorized, setIsEmbedAuthorized] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const typingTimerRef = useRef(null)
  const bottomRef = useRef(null)
  const chatStreamRef = useRef(null)
  const activityCounterRef = useRef(initialThreads.length)

  const activeThread = useMemo(
    () => chatThreads.find((thread) => thread.id === activeThreadId) ?? chatThreads[0],
    [activeThreadId, chatThreads],
  )
  const recentConversations = buildRecentConversations(chatThreads)

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadTopics() {
      try {
        const data = await fetchChatbotTopics(siteScope, embedOrigin)
        const uploadedTopicGroups = data.topicGroups?.filter((group) => group.items?.length) || []

        if (isMounted && uploadedTopicGroups.length > 0) {
          setKnowledgeTopics(uploadedTopicGroups)
        }
      } catch (error) {
        if (isMounted) {
          if (String(error.message || '').toLowerCase().includes('not authorized')) {
            setIsEmbedAuthorized(false)
          } else {
            setKnowledgeTopics(topicGroups)
          }
        }
      }
    }

    loadTopics()

    return () => {
      isMounted = false
    }
  }, [embedOrigin, siteScope])

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
      author: 'MCU Guide',
      role: 'assistant',
      text: data.answer || 'I found a response, but it did not include answer text.',
      blocks: data.answerBlocks,
      images: data.images || [],
      showImages: isScreenshotRequest(data.question || ''),
      time: getCurrentTime(),
      source: extraSourceCount > 0 ? `${sourceText}; +${extraSourceCount} more` : sourceText,
    }
  }

  function getLatestSourceMessage() {
    return [...activeThread.messages]
      .reverse()
      .find((messageItem) => messageItem.role === 'assistant' && messageItem.images?.length > 0)
  }

  function buildErrorReply(errorMessage) {
    return {
      author: 'MCU Guide',
      role: 'assistant',
      text: errorMessage || 'I cannot connect to the official knowledge base right now. Please try again later or contact the appropriate university office for confirmation.',
      time: getCurrentTime(),
      source: 'MCU Knowledge Base unavailable',
    }
  }

  async function submitQuestion(question) {
    const trimmedQuestion = question.trim()

    if (!trimmedQuestion || !activeThread) {
      return
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
        author: 'MCU Guide',
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
      return
    }

    try {
      const data = await askChatbot(trimmedQuestion, siteScope, embedOrigin)
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
    }
  }

  function handleSendMessage(event) {
    event.preventDefault()
    submitQuestion(message)
  }

  function handleQuickAction(value) {
    submitQuestion(value)
  }

  function handleThreadSelect(threadId) {
    stopTypingTimer()
    setIsTyping(false)
    setActiveThreadId(threadId)
    setMessage('')
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
            author: 'MCU Guide',
            role: 'assistant',
            text: 'Hi, I am ready to help with MCU services. Try a quick action, or type your question below.',
            time: getCurrentTime(),
            source: 'MCU Student Support',
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
    <main className={`mcu-kb-shell ${isEmbedMode ? 'is-embed' : ''} ${isCompactEmbedMode ? 'is-compact-embed' : ''}`}>
      {!isEmbedMode && (
      <header className="mcu-kb-header">
        <div className="mcu-kb-brand">
          <span aria-hidden="true">MCU</span>
          <div>
            <strong>MCU Knowledge Base</strong>
            <small>Student services assistant</small>
          </div>
        </div>
        <div className="mcu-kb-header-actions">
          <span className="mcu-kb-status">Online</span>
          <button type="button" onClick={handleNewChat}>New Chat</button>
        </div>
      </header>
      )}

      <section className="mcu-kb-layout">
        {!isEmbedMode && (
        <aside className="mcu-kb-nav" aria-label="Knowledge topics">
          <div className="mcu-kb-nav-head">
            <p>Topics</p>
            <span>{knowledgeTopics.reduce((total, group) => total + group.items.length, 0)} guides</span>
          </div>
          <div className="mcu-kb-topic-list">
            {knowledgeTopics.map((group) => (
              <section key={group.label}>
                <h2>{group.label}</h2>
                {group.items.map((item) => (
                  <button type="button" key={item.label} onClick={() => handleQuickAction(item.prompt)}>
                    <span>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </section>
            ))}
          </div>
        </aside>
        )}

        <section className="mcu-kb-chat" aria-label="Chat with MCU Guide">
          {isCompactEmbedMode && (
            <header className="mcu-kb-embed-header">
              <button type="button" aria-label="Back">‹</button>
              <span aria-hidden="true">M</span>
              <div>
                <strong>MCU Guide</strong>
                <small>I am here to assist you!</small>
              </div>
            </header>
          )}

          {isEmbedMode && !isEmbedAuthorized ? (
            <div className="mcu-kb-stream">
              <MessageBubble
                message={{
                  author: 'MCU Guide',
                  role: 'assistant',
                  text: 'This chatbot embed is not authorized for this website.',
                  time: getCurrentTime(),
                  source: 'MCU Guide',
                }}
              />
            </div>
          ) : (
          <>

          {!isEmbedMode && (
          <div className="mcu-kb-hero">
            <div>
              <h1>Ask questions across uploaded university documents.</h1>
              <span>Answers are grounded in your knowledge base whenever matching content is found.</span>
            </div>
            <div className="mcu-kb-hero-card">
              <strong>24/7</strong>
              <span>Knowledge access</span>
            </div>
          </div>
          )}

          <div className="mcu-kb-stream" ref={chatStreamRef}>
            {activeThread.messages.map((messageItem, index) => (
              <MessageBubble message={messageItem} key={`${messageItem.author}-${messageItem.time}-${index}`} />
            ))}
            {isTyping && (
              <div className="typing-row" aria-live="polite">
                <div className="avatar" aria-hidden="true">M</div>
                <div className="bubble typing-bubble">
                  <div className="message-meta">
                    <strong>MCU Guide</strong>
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
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask about enrollment, tuition, registrar, library, policies..."
            />
            <button type="submit" disabled={!message.trim() || isTyping}>Send</button>
          </form>
          </>
          )}
        </section>

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
                onClick={() => handleThreadSelect(conversation.threadId)}
              >
                <strong>{conversation.title}</strong>
                <span>{conversation.preview}</span>
              </button>
            ))}
          </section>
         
        </aside>
        )}
      </section>
    </main>
  )
}

export default Chatbot
