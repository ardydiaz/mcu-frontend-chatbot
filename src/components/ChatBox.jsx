import MessageBubble from './MessageBubble'

function ChatBox({ messages, message, onMessageChange }) {
  return (
    <div className="chat-card">
      <div className="chat-stream">
        {messages.map((messageItem) => (
          <MessageBubble message={messageItem} key={messageItem.text} />
        ))}
      </div>

      <form className="composer" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="chat-message">Message</label>
        <textarea
          id="chat-message"
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder="Type a question like: What are today's registrar office hours?"
          rows="3"
        />
        <div className="composer-actions">
          <span>Secure student helpdesk preview</span>
          <button type="submit">Send</button>
        </div>
      </form>
    </div>
  )
}

export default ChatBox
