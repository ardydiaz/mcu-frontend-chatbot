import { useEffect, useMemo, useRef, useState } from 'react'
import ChatBox from '../components/ChatBox'
import { askChatbot } from '../services/chatService'

const quickActions = [
  'How do I request my TOR?',
  'When is enrollment?',
  'How do I pay tuition?',
  'Where is the registrar?',
]

const faqCards = [
  'How do I request my transcript of records?',
  'Where can I pay tuition and fees?',
  'How do I reset my student portal password?',
  'What are the registrar office hours?',
  'How do I get clearance for enrollment?',
]

const initialThreads = [
  {
    id: 'registrar-tor',
    title: 'Registrar Request',
    topic: 'Registrar',
    updatedAt: 'Just now',
    messages: [
      {
        author: 'MCU Guide',
        role: 'assistant',
        text: 'Good afternoon! I can help with enrollment, registrar requests, campus services, and student portal concerns.',
        time: '2:18 PM',
        source: 'Student Handbook',
      },
      {
        author: 'Student',
        role: 'user',
        text: 'How do I request my transcript of records?',
        time: '2:19 PM',
      },
      {
        author: 'MCU Guide',
        role: 'assistant',
        text: 'You can start a TOR request through the Registrar service desk. Prepare your student number, valid ID, and clearance status before submitting.',
        time: '2:19 PM',
        source: 'Registrar Office',
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

function Chatbot() {
  const [message, setMessage] = useState('')
  const [chatThreads, setChatThreads] = useState(initialThreads)
  const [activeThreadId, setActiveThreadId] = useState(initialThreads[0].id)
  const [isChatOpen, setIsChatOpen] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const typingTimerRef = useRef(null)

  const activeThread = useMemo(
    () => chatThreads.find((thread) => thread.id === activeThreadId) ?? chatThreads[0],
    [activeThreadId, chatThreads],
  )

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
      }
    }
  }, [])

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
      ? data.sources.map((source) => `${source.title}, page ${source.pageNumber}`).join('; ')
      : 'MCU Knowledge Base'

    return {
      author: 'MCU Guide',
      role: 'assistant',
      text: data.answer || 'I found a response, but it did not include answer text.',
      time: getCurrentTime(),
      source: sourceText,
    }
  }

  function buildErrorReply(errorMessage, question) {
    const fallbackReply = getLocalAssistantReply(question)

    return {
      ...fallbackReply,
      text: `${errorMessage} ${fallbackReply.text}`,
      time: getCurrentTime(),
      source: fallbackReply.source,
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
      title: thread.title === 'New chat' ? trimmedQuestion.slice(0, 24) : thread.title,
      messages: [...thread.messages, userMessage],
    }))

    setMessage('')
    setIsTyping(true)

    try {
      const data = await askChatbot(trimmedQuestion)
      const assistantReply = buildApiAssistantReply(data)

      updateThread(activeThread.id, (thread) => ({
        ...thread,
        messages: [...thread.messages, assistantReply],
      }))
    } catch (requestError) {
      const assistantReply = buildErrorReply(
        requestError.message || 'I could not reach the MCU API right now.',
        trimmedQuestion,
      )

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

  function handleFaqSelect(value) {
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
    <main className="chatbot-widget-page">
      <section className={`chatbot-popup ${isChatOpen ? 'open' : ''}`} aria-label="University chatbot">
        <header className="chatbot-popup-header">
          <div className="chatbot-title">
            <div className="bot-icon" aria-hidden="true">
              <span></span>
            </div>
            <div>
              <strong>Chatbot</strong>
              <small>MCU Student Support</small>
            </div>
          </div>
          <button
            className="popup-collapse"
            type="button"
            aria-label="Hide chatbot"
            onClick={() => setIsChatOpen(false)}
          >
            <span></span>
          </button>
        </header>

        <ChatBox
          activeThread={activeThread}
          faqCards={faqCards}
          historyThreads={chatThreads}
          isTyping={isTyping}
          message={message}
          onFaqSelect={handleFaqSelect}
          onHistorySelect={handleThreadSelect}
          onMessageChange={setMessage}
          onNewChat={handleNewChat}
          onQuickAction={handleQuickAction}
          onSendMessage={handleSendMessage}
          quickActions={quickActions}
        />
      </section>

      <button
        className={`chatbot-toggle ${isChatOpen ? 'is-open' : ''}`}
        type="button"
        aria-label={isChatOpen ? 'Hide chatbot' : 'Open chatbot'}
        aria-expanded={isChatOpen}
        onClick={() => setIsChatOpen((current) => !current)}
      >
        <span></span>
      </button>
    </main>
  )
}

export default Chatbot
