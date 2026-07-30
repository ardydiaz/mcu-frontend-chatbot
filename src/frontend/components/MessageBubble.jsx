import { useState } from 'react'
import { API_BASE_URL } from '../../services/apiClient'
import mcuLogoCircle from '../../assets/mcu-logo-circle.png'

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
  const trimmedLine = String(line || '').trim()

  return (
    /^[A-Z][A-Z0-9\s|&/():-]{2,}$/.test(trimmedLine) ||
    /^(local|foreign)$/i.test(trimmedLine) ||
    /^notes?:?$/i.test(trimmedLine) ||
    /^user guide$/i.test(trimmedLine) ||
    /^(qualifications?|requirements?|terms\s*&\s*conditions?)$/i.test(trimmedLine) ||
    /\b(?:process flow|workflow|user guide|guide|procedure|steps|scholarships?|admission requirements?)\b$/i.test(trimmedLine)
  )
}

function normalizeDisplayLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .flatMap((line) => {
      const expandedLine = line
        .replace(/\s+(?=Step\s+\d+[:.)]\s+\S)/gi, '\n')
        .replace(/\s+(?=(?:\d+|[a-z]|[ivxlcdm]{1,6})[.)]\s+\S)/g, '\n')
        .replace(/\s+(?=[•●▪]\s+\S)/g, '\n')

      return expandedLine.split('\n')
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
  const value = String(line || '')

  return (
    value.match(/^\s*Step\s+(\d+)[:.)]\s*(.+)$/i) ||
    value.match(/^\s*((?:\d+|[a-z]|[ivxlcdm]{1,6})[.)])\s*(.+)$/) ||
    value.match(/^\s*([•●▪-])\s*(.+)$/)
  )
}

function isStatValue(text) {
  return /^\d+(?:[,.]\d+)?%?$/.test(String(text || '').trim())
}

function isStatLabel(text) {
  const value = String(text || '').trim()

  return value.length > 1 && value.length <= 60 && !/[.!?]$/.test(value) && !/^https?:\/\//i.test(value)
}

function shouldMergeParagraphLines(current, next) {
  const currentText = String(current || '').trim()
  const nextText = String(next || '').trim()

  if (!currentText || !nextText || isStatValue(currentText) || isStatValue(nextText)) {
    return false
  }

  if (/[.!?:;]$/.test(currentText)) {
    return false
  }

  return (
    /^[a-z("]/.test(nextText) ||
    /\b(?:a|an|and|at|by|for|from|in|of|or|the|to|with)$/i.test(currentText) ||
    currentText.length > 80
  )
}

function mergeWrappedParagraphBlocks(blocks) {
  const mergedBlocks = []
  let paragraphBuffer = null

  function flushParagraph() {
    if (paragraphBuffer) {
      mergedBlocks.push(paragraphBuffer)
      paragraphBuffer = null
    }
  }

  blocks.forEach((block) => {
    if (block.type !== 'p') {
      flushParagraph()
      mergedBlocks.push(block)
      return
    }

    if (paragraphBuffer && shouldMergeParagraphLines(paragraphBuffer.text, block.text)) {
      paragraphBuffer = {
        ...paragraphBuffer,
        text: `${paragraphBuffer.text} ${block.text}`.replace(/\s+/g, ' ').trim(),
      }
      return
    }

    flushParagraph()
    paragraphBuffer = block
  })

  flushParagraph()
  return mergedBlocks
}

function formatStatBlocks(blocks) {
  const formattedBlocks = []
  let index = 0

  while (index < blocks.length) {
    const statItems = []
    let cursor = index

    while (
      blocks[cursor]?.type === 'p' &&
      blocks[cursor + 1]?.type === 'p' &&
      isStatValue(blocks[cursor].text) &&
      isStatLabel(blocks[cursor + 1].text)
    ) {
      statItems.push({
        value: blocks[cursor].text,
        label: blocks[cursor + 1].text,
      })
      cursor += 2
    }

    if (statItems.length >= 2) {
      formattedBlocks.push({ type: 'statGrid', items: statItems })
      index = cursor
      continue
    }

    formattedBlocks.push(blocks[index])
    index += 1
  }

  return formattedBlocks
}

function isListSectionHeading(text) {
  return /^(local|foreign|requirements?|qualifications?|terms\s*&\s*conditions?|elementary|college|graduate studies|master of science|college of|foreign applicants?)\b/i.test(String(text || '').trim())
}

function shouldBecomeBullet(text) {
  const value = String(text || '').trim()

  return (
    value.length > 4 &&
    !isStatValue(value) &&
    !/^about\b/i.test(value) &&
    !/^(start your|journey with us|admission requirements)$/i.test(value)
  )
}

function formatRequirementLists(blocks) {
  const formattedBlocks = []
  let index = 0

  while (index < blocks.length) {
    const block = blocks[index]
    formattedBlocks.push(block)

    if (block.type !== 'heading' || !isListSectionHeading(block.text)) {
      index += 1
      continue
    }

    const items = []
    let cursor = index + 1

    while (blocks[cursor]?.type === 'p' && shouldBecomeBullet(blocks[cursor].text)) {
      items.push({
        marker: '-',
        value: blocks[cursor].text,
      })
      cursor += 1
    }

    if (items.length >= 3) {
      formattedBlocks.push({ type: 'ul', items })
      index = cursor
      continue
    }

    index += 1
  }

  return formattedBlocks
}

function improveReadableBlocks(blocks) {
  return formatRequirementLists(formatStatBlocks(mergeWrappedParagraphBlocks(blocks)))
}

function PreformattedText({ text, fullText, isTruncated }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const displayText = isExpanded && fullText ? fullText : text
  const blocks = parseMessageBlocks(displayText)

  return (
    <div className="message-preformatted">
      <MessageBlocks blocks={blocks} />
      {isTruncated && fullText && (
        <button className="message-see-more" type="button" onClick={() => setIsExpanded((current) => !current)}>
          {isExpanded ? 'See less' : 'See more'}
        </button>
      )}
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
    const markerMatch = getListMarkerMatch(line)
    const marker = markerMatch?.[1] || ''
    const lineValue = markerMatch?.[2] || ''
    const isUnorderedMarker = /^[•●▪-]$/.test(marker)
    const headingMatch = isPreformattedHeading(line) || /^GLNet On Line Help$/i.test(line)

    if (markerMatch) {
      const type = isUnorderedMarker ? 'ul' : 'ol'
      const cleanedMarker = isUnorderedMarker ? '-' : String(marker).replace(/[.)]$/, '')

      if (!currentList || currentList.type !== type) {
        flushList()
        currentList = { type, items: [] }
      }

      currentList.items.push({
        marker: cleanedMarker,
        value: lineValue,
        indentLevel: getLineIndentLevel(line, cleanedMarker),
      })
      return
    }

    flushList()
    blocks.push({ type: headingMatch ? 'heading' : 'p', text: line })
  })

  flushList()
  return improveReadableBlocks(blocks)
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
                  <span className="message-list-marker">{block.type === 'ul' ? '•' : item.marker}</span>
                  <p><LinkedText text={item.value} /></p>
                </div>
              ))}
            </div>
          )
        }

        if (block.type === 'statGrid') {
          return (
            <div className="message-stat-grid" key={`stats-${index}`}>
              {block.items.map((item) => (
                <div className="message-stat-card" key={`${item.value}-${item.label}`}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          )
        }

        if (block.type === 'heading') {
          return <strong className="message-heading" key={`heading-${index}`}>{block.text}</strong>
        }

        if (block.type === 'preformatted') {
          return (
            <PreformattedText
              text={block.text}
              fullText={block.fullText}
              isTruncated={block.isTruncated}
              key={`preformatted-${index}`}
            />
          )
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
  const isAssistant = message.role === 'assistant'

  return (
    <article className={`message ${message.role}`}>
      <div className="avatar">
        {isAssistant ? <img src={mcuLogoCircle} alt="" /> : 'S'}
      </div>
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

