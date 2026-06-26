import { useEffect, useMemo, useRef, useState } from 'react'
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

const welcomeCards = [
  { icon: 'A', title: 'Academic Programs', category: 'Academics', prompt: 'Tell me about academic programs.' },
  { icon: 'C', title: 'Academic Calendar', category: 'Academics', prompt: 'What is the academic calendar?' },
  { icon: 'S', title: 'Student Life', category: 'Student Life', prompt: 'Tell me about student life.' },
  { icon: '$', title: 'Tuition Info', category: 'Finance', prompt: 'Where can I find tuition information?' },
  { icon: 'L', title: 'Library', category: 'Services', prompt: 'What are the library hours?' },
  { icon: '?', title: 'Admissions', category: 'Admissions', prompt: 'What are the admission requirements?' },
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
        text: 'Welcome. Ask about MCU admissions, registrar services, tuition, library, student life, or any uploaded knowledge-base document.',
        time: getCurrentTime(),
        source: 'MCU Knowledge Base',
      },
    ],
  },
  {
    id: 'tuition',
    title: 'Tuition Help',
    topic: 'Finance',
    updatedAt: '1 day ago',
    messages: [
      {
        author: 'MCU Guide',
        role: 'assistant',
        text: 'I can help with tuition payment steps, deadlines, and payment channels.',
        time: '9:10 AM',
        source: 'Finance Office',
      },
    ],
  },
  {
    id: 'campus-services',
    title: 'Campus Services',
    topic: 'Student Life',
    updatedAt: '3 days ago',
    messages: [
      {
        author: 'MCU Guide',
        role: 'assistant',
        text: 'Need help with campus services, offices, or student concerns? I can point you to the right office.',
        time: '4:45 PM',
        source: 'Campus Services',
      },
    ],
  },
]

const responseRules = [
  {
    keywords: ['tor', 'transcript', 'records', 'registrar'],
    text: 'You can request your TOR through the Registrar service desk. Bring a valid ID, student number, and any required clearance.',
    source: 'Registrar Office',
  },
  {
    keywords: ['enroll', 'enrollment', 'admission', 'admissions'],
    text: 'Enrollment announcements are usually posted by Admissions and the Registrar. Please check the official schedule and prepare your clearance requirements.',
    source: 'Admissions Office',
  },
  {
    keywords: ['tuition', 'payment', 'fees', 'billing'],
    text: 'For tuition and fees, you can check the Finance Office process and payment options. I can also help outline the steps if needed.',
    source: 'Finance Office',
  },
  {
    keywords: ['portal', 'password', 'login', 'account'],
    text: 'If your student portal needs a reset, I can help you with the common steps and point you to the IT support process.',
    source: 'IT Support',
  },
  {
    keywords: ['clearance', 'requirements'],
    text: 'Clearance requirements depend on your office and semester status. The Registrar or your program office can confirm the latest checklist.',
    source: 'Registrar Office',
  },
]

function getCurrentTime() {
  return new Date().toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getLocalAssistantReply(question) {
  const normalized = question.toLowerCase()
  const match = responseRules.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword)))

  if (match) {
    return {
      author: 'MCU Guide',
      role: 'assistant',
      text: match.text,
      time: getCurrentTime(),
      source: match.source,
    }
  }

  return {
    author: 'MCU Guide',
    role: 'assistant',
    text: 'I can help with registrar, enrollment, tuition, and campus support. If you want, I can connect this to a specific office or FAQ section.',
    time: getCurrentTime(),
    source: 'MCU Student Support',
  }
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

function Chatbot() {
  const [message, setMessage] = useState('')
  const [knowledgeTopics, setKnowledgeTopics] = useState(topicGroups)
  const [chatThreads, setChatThreads] = useState(initialThreads)
  const [activeThreadId, setActiveThreadId] = useState(initialThreads[0].id)
  const [isTyping, setIsTyping] = useState(false)
  const typingTimerRef = useRef(null)
  const bottomRef = useRef(null)
  const chatStreamRef = useRef(null)

  const activeThread = useMemo(
    () => chatThreads.find((thread) => thread.id === activeThreadId) ?? chatThreads[0],
    [activeThreadId, chatThreads],
  )
  const recentThreads = useMemo(
    () =>
      chatThreads
        .map((thread) => {
          const latestMessage = thread.messages[thread.messages.length - 1]

          return {
            ...thread,
            preview: latestMessage?.role === 'user'
              ? getMessagePreview(latestMessage.text)
              : getMessagePreview(latestMessage?.text || thread.topic),
            sortTime: thread.lastActivityAt || 0,
          }
        })
        .sort((a, b) => b.sortTime - a.sortTime),
    [chatThreads],
  )

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
        const data = await fetchChatbotTopics()
        const uploadedTopicGroups = data.topicGroups?.filter((group) => group.items?.length) || []

        if (isMounted && uploadedTopicGroups.length > 0) {
          setKnowledgeTopics(uploadedTopicGroups)
        }
      } catch {
        if (isMounted) {
          setKnowledgeTopics(topicGroups)
        }
      }
    }

    loadTopics()

    return () => {
      isMounted = false
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

  function buildErrorReply(question) {
    const fallbackReply = getLocalAssistantReply(question)

    return {
      ...fallbackReply,
      text: fallbackReply.text,
      time: getCurrentTime(),
      source: `${fallbackReply.source} fallback`,
    }
  }

  async function submitQuestion(question) {
    const trimmedQuestion = question.trim()

    if (!trimmedQuestion || !activeThread) {
      return
    }

    stopTypingTimer()

    const userMessage = {
      author: 'Student',
      role: 'user',
      text: trimmedQuestion,
      time: getCurrentTime(),
    }

    updateThread(activeThread.id, (thread) => ({
      ...thread,
      updatedAt: 'Just now',
      lastActivityAt: Date.now(),
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
      const data = await askChatbot(trimmedQuestion)
      const assistantReply = buildApiAssistantReply(data)

      updateThread(activeThread.id, (thread) => ({
        ...thread,
        messages: [...thread.messages, assistantReply],
      }))
    } catch {
      const assistantReply = buildErrorReply(trimmedQuestion)

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
    const id = `chat-${Date.now()}`

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
      },
      ...currentThreads,
    ])
    setActiveThreadId(id)
    setMessage('')
  }

  return (
    <main className="mcu-kb-shell">
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

      <section className="mcu-kb-layout">
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

        <section className="mcu-kb-chat" aria-label="Chat with MCU Guide">
          <div className="mcu-kb-hero">
            <div>
              <p>AI powered campus support</p>
              <h1>Ask questions across uploaded university documents.</h1>
              <span>Answers are grounded in your knowledge base whenever matching content is found.</span>
            </div>
            <div className="mcu-kb-hero-card">
              <strong>24/7</strong>
              <span>Knowledge access</span>
            </div>
          </div>

          {activeThread.messages.length <= 1 && (
            <div className="mcu-kb-prompt-grid">
              {welcomeCards.map((card) => (
                <button type="button" key={card.title} onClick={() => handleQuickAction(card.prompt)}>
                  <span>{card.icon}</span>
                  <strong>{card.title}</strong>
                  <small>{card.category}</small>
                </button>
              ))}
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
        </section>

        <aside className="mcu-kb-insights" aria-label="Conversation context">
          <section>
            <p>Current Session</p>
            <h2>{activeThread.title}</h2>
            <span>{activeThread.messages.length} messages</span>
          </section>
          <section>
            <p>Recent Conversations</p>
            {recentThreads.slice(0, 5).map((thread) => (
              <button
                className={thread.id === activeThread.id ? 'active' : ''}
                type="button"
                key={thread.id}
                onClick={() => handleThreadSelect(thread.id)}
              >
                <strong>{thread.title}</strong>
                <span>{thread.preview || thread.topic}</span>
              </button>
            ))}
          </section>
          <section>
            <p>Source Behavior</p>
            <small>When available, responses include document names and page numbers from the uploaded knowledge base.</small>
          </section>
        </aside>
      </section>
    </main>
  )
}

export default Chatbot
