import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'

function ChatBox({
  activeThread,
  faqCards,
  historyThreads,
  isTyping,
  message,
  onFaqSelect,
  onHistorySelect,
  onMessageChange,
  onNewChat,
  onQuickAction,
  onSendMessage,
  quickActions,
}) {
  const bottomRef = useRef(null)
  const hasMessage = message.trim().length > 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [activeThread?.messages, isTyping])

  return (
    <div className="chatbot-body">
      <div className="chat-card">
        <div className="chat-stream">
          {activeThread.messages.map((messageItem, index) => (
            <MessageBubble message={messageItem} key={`${messageItem.author}-${messageItem.time}-${index}`} />
          ))}

          {isTyping && (
            <div className="typing-row" aria-live="polite">
              <div className="avatar" aria-hidden="true">
                M
              </div>
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

      <aside className="chat-rail" aria-label="Chat assistance">
        <section className="chat-panel">
          <div className="chat-panel-head">
            <div>
              <p className="chat-panel-kicker">Start fast</p>
              <h3>Quick Actions</h3>
            </div>
            <button className="chat-link-button" type="button" onClick={onNewChat}>
              New Chat
            </button>
          </div>

          <div className="quick-action-list">
            {quickActions.map((action) => (
              <button key={action} className="quick-action-chip" type="button" onClick={() => onQuickAction(action)}>
                {action}
              </button>
            ))}
          </div>
        </section>

        <section className="chat-panel">
          <p className="chat-panel-kicker">Popular answers</p>
          <h3>Frequently Asked</h3>
          <div className="faq-list">
            {faqCards.map((question) => (
              <button key={question} className="faq-card" type="button" onClick={() => onFaqSelect(question)}>
                <strong>{question}</strong>
                <span>Tap to ask the bot</span>
              </button>
            ))}
          </div>
        </section>

        <section className="chat-panel">
          <p className="chat-panel-kicker">Recent sessions</p>
          <h3>Conversation History</h3>
          <div className="history-list">
            {historyThreads.map((thread) => (
              <button
                key={thread.id}
                className={`history-item ${thread.id === activeThread.id ? 'active' : ''}`}
                type="button"
                onClick={() => onHistorySelect(thread.id)}
              >
                <strong>{thread.title}</strong>
                <span>{thread.topic}</span>
                <small>{thread.updatedAt}</small>
              </button>
            ))}
          </div>
        </section>
      </aside>
    </div>
  )
}

export default ChatBox
