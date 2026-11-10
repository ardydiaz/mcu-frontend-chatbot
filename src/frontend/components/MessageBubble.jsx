import { useEffect, useMemo, useRef, useState } from 'react'
import { API_BASE_URL } from '../../services/apiClient'
import mcuLogoCircle from '../../assets/mcu-logo-circle.png'

function getInitials(name = '', email = '') {
  const source = name || email || 'Student'
  const parts = source
    .replace(/@.*/, '')
    .split(/[\s._-]+/)
    .filter(Boolean)

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'S'
}

function buildImageUrl(url) {
  return new URL(url, API_BASE_URL).toString()
}

function getPreviewDocumentId(image) {
  if (image?.documentId) {
    return image.documentId
  }

  const url = String(image?.url || '')

  return url.match(/\/storage\/images\/(\d+)\//)?.[1]
    || url.match(/\/api\/documents\/(\d+)\/preview-file/)?.[1]
    || null
}

function isPdfPagePreview(image) {
  return image?.previewType === 'pdf_page' || Boolean(getPreviewDocumentId(image))
}

function buildPreviewUrl(image) {
  const documentId = getPreviewDocumentId(image)
  const previewUrl = image?.previewFileUrl || (documentId ? `/api/documents/${documentId}/preview-file` : image?.url)
  const fileUrl = buildImageUrl(previewUrl)

  if (!isPdfPagePreview(image)) {
    return fileUrl
  }

  return `${fileUrl}#page=${image.pageNumber || 1}&zoom=125&view=FitH`
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

// --- Numbered steps -----------------------------------------------------------
// The AI sometimes writes steps inline ("1. Do this. 2. Do that.") inside a
// paragraph. Split those into a proper numbered list so steps always line up.

const LIST_MARKER_PREFIX = /^\s*(?:step\s+)?\d{1,2}[.)]\s+/i

// Finds "1. ", "2. ", "3. " ... in order. Returns null unless at least 2 steps exist.
function splitInlineNumberedSteps(text) {
  const value = String(text || '')
  const positions = []
  let searchFrom = 0

  for (let number = 1; number <= 30; number += 1) {
    const pattern = new RegExp(`(^|\\s)${number}[.)]\\s+(?=\\S)`, 'g')
    pattern.lastIndex = searchFrom
    const match = pattern.exec(value)

    if (!match) {
      break
    }

    const markerStart = match.index + match[1].length
    positions.push({ markerStart, textStart: match.index + match[0].length })
    searchFrom = match.index + match[0].length
  }

  if (positions.length < 2) {
    return null
  }

  const items = positions.map((position, index) => {
    const end = positions[index + 1]?.markerStart ?? value.length
    return value.slice(position.textStart, end).trim()
  })

  return {
    intro: value.slice(0, positions[0].markerStart).trim(),
    items,
  }
}

function normalizeAnswerBlocks(blocks) {
  return blocks.flatMap((block) => {
    const isParagraph = block.type === 'p' || block.type === 'paragraph'

    if (isParagraph) {
      const steps = splitInlineNumberedSteps(block.text)

      if (!steps) {
        return [block]
      }

      const listBlock = {
        type: 'ol',
        items: steps.items.map((value, index) => ({ marker: String(index + 1), value })),
      }

      return steps.intro ? [{ ...block, text: steps.intro }, listBlock] : [listBlock]
    }

    if (block.type === 'list' || block.type === 'ol') {
      // Items like "1. Get a queue number" would otherwise show the number twice.
      return [{
        ...block,
        items: block.items.map((item, index) => {
          const value = String(typeof item === 'string' ? item : item?.value || '').replace(LIST_MARKER_PREFIX, '')
          return typeof item === 'string'
            ? { marker: String(index + 1), value }
            : { ...item, value }
        }),
      }]
    }

    return [block]
  })
}

// --- Typing animation -------------------------------------------------------
// Answers arrive complete from the API; these helpers reveal them word by word
// while keeping the parsed block structure (headings, lists, stats) intact.

const TYPING_TICK_MS = 30
const TYPING_MAX_DURATION_MS = 4000

function countWords(text) {
  return String(text || '').split(/\s+/).filter(Boolean).length
}

function takeWords(text, wordCount) {
  const words = String(text || '').split(/(\s+)/)
  let taken = 0
  let result = ''

  for (const part of words) {
    if (/^\s+$/.test(part)) {
      result += part
      continue
    }

    if (!part) {
      continue
    }

    if (taken >= wordCount) {
      break
    }

    result += part
    taken += 1
  }

  return result.trimEnd()
}

function getListItemText(item) {
  return typeof item === 'string' ? item : item?.value
}

function countBlockWords(blocks) {
  return blocks.reduce((total, block) => {
    if (block.type === 'ol' || block.type === 'ul' || block.type === 'list') {
      return total + block.items.reduce((sum, item) => sum + Math.max(1, countWords(getListItemText(item))), 0)
    }

    if (block.type === 'statGrid') {
      return total + block.items.length
    }

    return total + Math.max(1, countWords(block.text))
  }, 0)
}

// Returns the blocks cut off after `budget` words, so the answer appears to type out.
function truncateBlocks(blocks, budget) {
  const visibleBlocks = []
  let remaining = budget

  for (const block of blocks) {
    if (remaining <= 0) {
      break
    }

    if (block.type === 'ol' || block.type === 'ul' || block.type === 'list') {
      const items = []

      for (const [itemIndex, item] of block.items.entries()) {
        if (remaining <= 0) {
          break
        }

        const text = getListItemText(item)
        const words = Math.max(1, countWords(text))
        const visibleText = words <= remaining ? text : takeWords(text, remaining)
        remaining -= Math.min(words, remaining)
        items.push(typeof item === 'string'
          ? { marker: itemIndex + 1, value: visibleText }
          : { ...item, value: visibleText })
      }

      visibleBlocks.push({ ...block, items })
      continue
    }

    if (block.type === 'statGrid') {
      const items = block.items.slice(0, remaining)
      remaining -= items.length
      visibleBlocks.push({ ...block, items })
      continue
    }

    const words = Math.max(1, countWords(block.text))

    if (words <= remaining) {
      visibleBlocks.push(block)
      remaining -= words
      continue
    }

    visibleBlocks.push({ ...block, text: takeWords(block.text, remaining), fullText: undefined, isTruncated: false })
    remaining = 0
  }

  return visibleBlocks
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function useTypewriter(totalWords, isEnabled, { onProgress, onDone } = {}) {
  const shouldAnimate = isEnabled && totalWords > 0 && !prefersReducedMotion()
  const [revealedWords, setRevealedWords] = useState(() => (shouldAnimate ? 0 : totalWords))
  const callbacksRef = useRef({ onProgress, onDone })

  useEffect(() => {
    callbacksRef.current = { onProgress, onDone }
  })

  useEffect(() => {
    if (!shouldAnimate) {
      return undefined
    }

    // Short answers type at a natural pace; long ones speed up so they finish in a few seconds.
    const maxTicks = TYPING_MAX_DURATION_MS / TYPING_TICK_MS
    const wordsPerTick = Math.max(1, Math.ceil(totalWords / maxTicks))
    let current = 0

    const intervalId = window.setInterval(() => {
      current = Math.min(totalWords, current + wordsPerTick)
      setRevealedWords(current)
      callbacksRef.current.onProgress?.()

      if (current >= totalWords) {
        window.clearInterval(intervalId)
        callbacksRef.current.onDone?.()
      }
    }, TYPING_TICK_MS)

    return () => window.clearInterval(intervalId)
  }, [shouldAnimate, totalWords])

  const isTyping = shouldAnimate && revealedWords < totalWords

  return { revealedWords: shouldAnimate ? revealedWords : totalWords, isTyping }
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

function MessageBubble({ message, currentUser, animate = false, isStreaming = false, onTypingProgress, onTypingDone }) {
  const [activeImage, setActiveImage] = useState(null)
  const isAssistant = message.role === 'assistant'
  const blocks = useMemo(
    () => normalizeAnswerBlocks(message.blocks?.length ? message.blocks : parseMessageBlocks(message.text)),
    [message.blocks, message.text],
  )
  const totalWords = useMemo(() => countBlockWords(blocks), [blocks])
  const { revealedWords, isTyping } = useTypewriter(totalWords, animate && isAssistant, {
    onProgress: onTypingProgress,
    onDone: onTypingDone,
  })
  const visibleBlocks = isTyping ? truncateBlocks(blocks, revealedWords) : blocks
  const images = message.images || []
  const shouldShowImages = message.showImages && images.length > 0 && !isTyping
  const userPhotoUrl = !isAssistant ? currentUser?.photoUrl : ''
  const userInitials = getInitials(currentUser?.name, currentUser?.email)
  const displayAuthor = !isAssistant && message.author === 'Student'
    ? currentUser?.name || currentUser?.email || 'User'
    : message.author

  return (
    <article className={`message ${message.role}`}>
      <div className={`avatar ${userPhotoUrl ? 'has-photo' : ''}`}>
        {isAssistant && <img src={mcuLogoCircle} alt="" />}
        {!isAssistant && userPhotoUrl && (
          <img src={userPhotoUrl} alt="" referrerPolicy="no-referrer" />
        )}
        {!isAssistant && !userPhotoUrl && userInitials}
      </div>
      <div className={`bubble${isTyping || isStreaming ? ' is-typing-answer' : ''}`} aria-busy={isTyping || isStreaming || undefined}>
        <div className="message-meta">
          <strong>{displayAuthor}</strong>
          <span>{message.time}</span>
        </div>
        <MessageBlocks blocks={visibleBlocks} />
        {shouldShowImages && (
          <div className="message-screenshots">
            <div className="message-screenshots-head">
              <strong>Document preview</strong>
              <span>{images.length} page{images.length === 1 ? '' : 's'}</span>
            </div>
            <div className="message-screenshot-grid">
              {images.slice(0, 4).map((image, index) => (
                <button type="button" key={`${image.url}-${index}`} onClick={() => setActiveImage(image)}>
                  {isPdfPagePreview(image) ? (
                    <span className="message-page-preview-card">
                      <strong>PDF</strong>
                      <span>Page {image.pageLabel || image.pageNumber}</span>
                    </span>
                  ) : (
                    <img src={buildImageUrl(image.url)} alt={`${image.title} page ${image.pageNumber}`} />
                  )}
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
            {isPdfPagePreview(activeImage) ? (
              <div className="screenshot-modal-body">
                <iframe
                  title={`${activeImage.title} page ${activeImage.pageLabel || activeImage.pageNumber}`}
                  src={buildPreviewUrl(activeImage)}
                />
              </div>
            ) : (
              <div className="screenshot-modal-body">
                <img src={buildImageUrl(activeImage.url)} alt={`${activeImage.title} page ${activeImage.pageNumber}`} />
              </div>
            )}
          </section>
        </div>
      )}
    </article>
  )
}

export default MessageBubble

