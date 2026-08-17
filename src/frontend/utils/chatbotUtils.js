export function getCurrentTime() {
  return new Date().toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export const defaultAssistantGreeting =
  'Hi! I am centralino bot, how can i help you today?'

const legacyAssistantGreetings = [
  'Welcome to the MCU Knowledge Assistant!',
  defaultAssistantGreeting,
]

export function isDefaultAssistantGreeting(text) {
  const normalizedText = String(text || '').trim()

  return legacyAssistantGreetings.some((greeting) => normalizedText.startsWith(greeting))
}

export const initialThreads = [
  {
    id: 'welcome',
    title: 'New conversation',
    topic: 'General',
    updatedAt: 'Just now',
    messages: [
      {
        author: 'Centralino Bot',
        role: 'assistant',
        text: defaultAssistantGreeting,
        time: getCurrentTime(),
        source: 'MCU Knowledge Base',
      },
    ],
  },
]

const smartSuggestionPrompts = [
  'What are the enrollment requirements?',
  'What are the tuition fees?',
  'What are the graduation requirements?',
  'How do I access the student portal?',
  'How do I pay my tuition fee?',
  'Can you show me the source page?',
  'Do you have images for this topic?',
  'Tell me about enrollment process.',
]

export function getMessagePreview(text) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim()
  return normalized.length > 54 ? `${normalized.slice(0, 54)}...` : normalized
}

export function isScreenshotRequest(question) {
  return /\b(screenshot|screenshots|screen shot|screen shots|image|images|picture|pictures|photo|photos|visual|show me|source page|source pages|page image|page images|pdf page|pdf pages)\b/i.test(question)
}

export function isFollowUpScreenshotRequest(question) {
  const remainingText = question
    .toLowerCase()
    .replace(/\b(can|could|you|please|give|send|show|me|the|a|an|of|or|and|for|source|page|pdf|image|images|picture|photo|screenshot|screen shot|visual|more|explain|explanation|details|detailed|with)\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return isScreenshotRequest(question) && remainingText.length === 0
}

export function getEmbedOrigin(isEmbedMode, explicitEmbedOrigin) {
  if (explicitEmbedOrigin) {
    try {
      return new URL(explicitEmbedOrigin).origin
    } catch {
      return explicitEmbedOrigin
    }
  }

  if (!isEmbedMode) {
    return window.location.origin
  }

  try {
    return document.referrer ? new URL(document.referrer).origin : window.location.origin
  } catch {
    return window.location.origin
  }
}

export function buildRecentConversations(chatThreads) {
  const recentQuestions = chatThreads.flatMap((thread) =>
    thread.messages
      .map((messageItem, index) => {
        if (messageItem.role !== 'user') {
          return null
        }

        const nextAssistantMessage = thread.messages
          .slice(index + 1)
          .find((nextMessage) => nextMessage.role === 'assistant')

        return {
          id: `${thread.id}-${index}`,
          threadId: thread.id,
          messageIndex: index,
          title: getMessagePreview(messageItem.text),
          preview: getMessagePreview(nextAssistantMessage?.text || thread.topic),
          sortTime: messageItem.createdAt || thread.lastActivityAt || 0,
        }
      })
      .filter(Boolean),
  )

  if (recentQuestions.length > 0) {
    return [...recentQuestions].sort((a, b) => b.sortTime - a.sortTime)
  }

  return []
}

function normalizeSuggestionText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildSmartSuggestions(inputValue, knowledgeTopics) {
  const normalizedInput = normalizeSuggestionText(inputValue)

  if (normalizedInput.length < 3) {
    return []
  }

  const topicPrompts = knowledgeTopics.flatMap((group) =>
    group.items?.flatMap((item) => [item.prompt, `Tell me about ${item.label}.`]) || [],
  )
  const suggestions = [...smartSuggestionPrompts, ...topicPrompts]
    .filter(Boolean)
    .filter((suggestion, index, allSuggestions) => allSuggestions.indexOf(suggestion) === index)

  return suggestions
    .map((suggestion) => {
      const normalizedSuggestion = normalizeSuggestionText(suggestion)
      const inputTerms = normalizedInput.split(' ').filter(Boolean)
      const matchedTerms = inputTerms.filter((term) => normalizedSuggestion.includes(term)).length
      const startsWithInput = normalizedSuggestion.startsWith(normalizedInput)

      return {
        text: suggestion,
        score: (startsWithInput ? 20 : 0) + matchedTerms,
      }
    })
    .filter((suggestion) => suggestion.score > 0)
    .sort((a, b) => b.score - a.score || a.text.length - b.text.length)
    .slice(0, 5)
    .map((suggestion) => suggestion.text)
}

