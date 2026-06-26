import { useState } from 'react'
import { API_BASE_URL } from '../../services/apiClient'

function buildImageUrl(url) {
  return new URL(url, API_BASE_URL).toString()
}

function LinkedText({ text }) {
  const parts = String(text || '').split(/(https?:\/\/[^\s]+)/g)

  return (
    <>
      {parts.map((part, index) => {
        if (!/^https?:\/\//i.test(part)) {
          return part
        }

        const href = part.replace(/[),.;:!?]+$/, '')
        const trailingText = part.slice(href.length)

        return (
          <span key={`${part}-${index}`}>
            <a href={href} target="_blank" rel="noreferrer">{href}</a>
            {trailingText}
          </span>
        )
      })}
    </>
  )
}

function isPreformattedHeading(line) {
  return (
    /^[A-Z][A-Z0-9\s|&/():-]{2,}$/.test(line) ||
    /^notes?:?$/i.test(line) ||
    /^user guide$/i.test(line) ||
    /\b(?:process flow|workflow|user guide|guide|procedure|steps)\b$/i.test(line)
  )
}

function normalizeDisplayLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .flatMap((line) => {
      const markerMatches = line.match(/\s+(?=(?:\d+|[A-Za-z]{1,4})[.)]\s+\S)/g) || []

      if (markerMatches.length < 2) {
        return [line]
      }

      return line
        .replace(/\s+(?=((?:\d+|[A-Za-z]{1,4})[.)]\s+\S))/g, '\n')
        .split('\n')
    })
}

function getMarkerIndentLevel(marker) {
  const cleanMarker = String(marker || '').replace(/[.)]$/, '')

  if (/^\d+$/.test(cleanMarker)) {
    return 0
  }

  if (/^(?:i{1,3}|iv|v|vi{0,3}|ix|x)$/i.test(cleanMarker)) {
    return 2
  }

  if (/^[A-Za-z]{1,4}$/.test(cleanMarker)) {
    return 1
  }

  return 0
}

function getIndentStyle(indentLevel) {
  return indentLevel > 0 ? { marginLeft: `${Math.min(6, indentLevel) * 34}px` } : undefined
}

function getLineIndentLevel(line, marker) {
  const leadingWhitespace = String(line || '').match(/^\s*/)?.[0] || ''
  const whitespaceIndentLevel = Math.floor(leadingWhitespace.replace(/\t/g, '  ').length / 2)
  const markerIndentLevel = marker ? getMarkerIndentLevel(marker) : 0

  return Math.min(6, Math.max(whitespaceIndentLevel, markerIndentLevel))
}

function getListMarkerMatch(line) {
  return String(line || '').match(/^\s*((?:\d+|[A-Za-z]{1,4})[.)])\s*(.+)$/)
}

function PreformattedText({ text }) {
  const lines = normalizeDisplayLines(text)

  return (
    <div className="message-preformatted">
      {lines.map((line, index) => {
        const trimmedLine = line.trim()
        const numberedMatch = getListMarkerMatch(line)
        const indentStyle = getIndentStyle(getLineIndentLevel(line, numberedMatch?.[1]))

        if (!trimmedLine) {
          return <div className="message-preformatted-space" key={`space-${index}`} aria-hidden="true"></div>
        }

        if (numberedMatch) {
          return (
            <div className="message-preformatted-numbered" key={`${line}-${index}`} style={indentStyle}>
              <span className="message-list-marker">{numberedMatch[1].replace(/[.)]$/, '')}</span>
              <p><LinkedText text={numberedMatch[2]} /></p>
            </div>
          )
        }

        if (isPreformattedHeading(trimmedLine)) {
          return <strong className="message-heading" key={`${line}-${index}`}>{trimmedLine.replace(/:$/, '')}</strong>
        }

        return (
          <p className="message-preformatted-line" key={`${line}-${index}`} style={indentStyle}>
            <LinkedText text={trimmedLine} />
          </p>
        )
      })}
    </div>
  )
}

function parseMessageBlocks(text) {
  const lines = normalizeDisplayLines(text).map((line) => line.trim()).filter(Boolean)
  const blocks = []
  let currentList = null

  function flushList() {
    if (currentList) {
      blocks.push(currentList)
      currentList = null
    }
  }

  lines.forEach((line) => {
    const orderedMatch = line.match(/^(\d+|[A-Za-z]{1,4})[.)]\s+(.+)$/)
    const unorderedMatch = line.match(/^[-*]\s+(.+)$/)
    const headingMatch = isPreformattedHeading(line) || /^GLNet On Line Help$/i.test(line)

    if (orderedMatch || unorderedMatch) {
      const type = orderedMatch ? 'ol' : 'ul'
      const value = orderedMatch ? orderedMatch[2] : unorderedMatch[1]
      const marker = orderedMatch ? orderedMatch[1] : '-'

      if (!currentList || currentList.type !== type) {
        flushList()
        currentList = { type, items: [] }
      }

      currentList.items.push({ marker, value, indentLevel: getMarkerIndentLevel(marker) })
      return
    }

    flushList()
    blocks.push({ type: headingMatch ? 'heading' : 'p', text: line })
  })

  flushList()
  return blocks
}

function MessageText({ text }) {
  const blocks = parseMessageBlocks(text)

  return <MessageBlocks blocks={blocks} />
}

function MessageBlocks({ blocks }) {
  return (
    <div className="message-text">
      {blocks.map((block, index) => {
        if (block.type === 'ol' || block.type === 'ul' || block.type === 'list') {
          const items = block.items.map((item, itemIndex) => {
            if (typeof item === 'string') {
              return {
                marker: itemIndex + 1,
                value: item,
              }
            }

            return item
          })

          return (
            <div className={`message-list ${block.type === 'ol' ? 'ordered' : 'unordered'}`} key={`${block.type}-${index}`}>
              {items.map((item, itemIndex) => (
                <div className="message-list-item" key={`${item.value}-${itemIndex}`} style={getIndentStyle(item.indentLevel || getMarkerIndentLevel(item.marker))}>
                  <span className="message-list-marker">{block.type === 'ul' ? '-' : item.marker}</span>
                  <p><LinkedText text={item.value} /></p>
                </div>
              ))}
            </div>
          )
        }

        if (block.type === 'heading') {
          return <strong className="message-heading" key={`heading-${index}`}>{block.text}</strong>
        }

        if (block.type === 'preformatted') {
          return <PreformattedText text={block.text} key={`preformatted-${index}`} />
        }

        return (
          <p className={block.variant === 'summary' ? 'message-summary' : undefined} key={`p-${index}`}>
            <LinkedText text={block.text} />
          </p>
        )
      })}
    </div>
  )
}

function MessageBubble({ message }) {
  const [activeImage, setActiveImage] = useState(null)
  const images = message.images || []
  const shouldShowImages = message.showImages && images.length > 0

  return (
    <article className={`message ${message.role}`}>
      <div className="avatar">{message.role === 'assistant' ? 'M' : 'S'}</div>
      <div className="bubble">
        <div className="message-meta">
          <strong>{message.author}</strong>
          <span>{message.time}</span>
        </div>
        {message.blocks?.length ? <MessageBlocks blocks={message.blocks} /> : <MessageText text={message.text} />}
        {shouldShowImages && (
          <div className="message-screenshots">
            <div className="message-screenshots-head">
              <strong>Document preview</strong>
              <span>{images.length} page{images.length === 1 ? '' : 's'}</span>
            </div>
            <div className="message-screenshot-grid">
              {images.slice(0, 4).map((image, index) => (
                <button type="button" key={`${image.url}-${index}`} onClick={() => setActiveImage(image)}>
                  <img src={buildImageUrl(image.url)} alt={`${image.title} page ${image.pageNumber}`} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {activeImage && (
        <div className="screenshot-modal-backdrop" role="presentation" onClick={() => setActiveImage(null)}>
          <section className="screenshot-modal" role="dialog" aria-modal="true" aria-label="Source screenshot" onClick={(event) => event.stopPropagation()}>
            <header>
              <strong>Page preview</strong>
              <button type="button" onClick={() => setActiveImage(null)}>Close</button>
            </header>
            <img src={buildImageUrl(activeImage.url)} alt={`${activeImage.title} page ${activeImage.pageNumber}`} />
          </section>
        </div>
      )}
    </article>
  )
}

export default MessageBubble
