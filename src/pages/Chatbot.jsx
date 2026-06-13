import { useState } from 'react'
import ChatBox from '../components/ChatBox'
import Sidebar from '../components/Sidebar'

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
    <main className="app-shell">
      <Sidebar />

      <section className="chat-workspace" aria-label="University chatbot">
        <header className="chat-header">
          <div>
            <p className="eyebrow">Student Support Assistant</p>
            <h2>Ask about school services, forms, and schedules</h2>
          </div>
          <button className="new-chat" type="button">
            New Chat
          </button>
        </header>

        <ChatBox
          messages={chatMessages}
          message={message}
          onMessageChange={setMessage}
          onSendMessage={handleSendMessage}
        />
      </section>
    </main>
  )
}

export default Chatbot
