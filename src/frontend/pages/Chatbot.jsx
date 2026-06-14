import { useState } from 'react'
import ChatBox from '../components/ChatBox'

const conversations = [
  {
    author: 'MCU Guide',
    role: 'assistant',
    text: 'Good afternoon! I can help with enrollment, registrar requests, campus services, and student portal concerns.',
    time: '2:18 PM',
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
  },
]

function Chatbot() {
  const [message, setMessage] = useState('')
  const [chatMessages, setChatMessages] = useState(conversations)
  const [isChatOpen, setIsChatOpen] = useState(true)

  function handleSendMessage(event) {
    event.preventDefault()

    const trimmedMessage = message.trim()

    if (!trimmedMessage) {
      return
    }

    setChatMessages((currentMessages) => [
      ...currentMessages,
      {
        author: 'Student',
        role: 'user',
        text: trimmedMessage,
        time: new Date().toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        }),
      },
    ])
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
          messages={chatMessages}
          message={message}
          onMessageChange={setMessage}
          onSendMessage={handleSendMessage}
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
