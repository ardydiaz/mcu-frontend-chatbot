import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'

function ChatBox({ messages, message, onMessageChange, onSendMessage }) {
  const bottomRef = useRef(null)
  const hasMessage = message.trim().length > 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  return (
    <div className="chat-card">
      <div className="chat-stream">
        {messages.map((messageItem) => (
          <MessageBubble message={messageItem} key={messageItem.text} />
        ))}
        <div ref={bottomRef} aria-hidden="true"></div>
      </div>

      <form className="composer" onSubmit={onSendMessage}>
        <label htmlFor="chat-message">Message</label>
        <textarea
          id="chat-message"
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder="Type a question like: What are today's registrar office hours?"
          rows="3"
        />
        {hasMessage && (
          <div className="composer-actions">
            <span>Send message</span>
            <button type="submit" aria-label="Send message">
              <span aria-hidden="true"></span>
            </button>
          </div>
        )}
      </form>
    </div>
  )
}

export default ChatBox
