function MessageBubble({ message }) {
  return (
    <article className={`message ${message.role}`}>
      <div className="avatar">{message.role === 'assistant' ? 'M' : 'S'}</div>
      <div className="bubble">
        <div className="message-meta">
          <strong>{message.author}</strong>
          <span>{message.time}</span>
        </div>
        <p>{message.text}</p>
        {message.source && (
          <div className="message-source">
            <span>Source</span>
            <strong>{message.source}</strong>
          </div>
        )}
      </div>
    </article>
  )
}

export default MessageBubble
