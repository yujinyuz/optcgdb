import DOMPurify from 'dompurify'

const HTML_ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
}

/**
 * Decode common HTML entities in text (e.g. &amp; -> &)
 */
export function decodeHtmlEntities(text: string | null | undefined): string {
  if (!text) return ''
  return text.replace(/&(?:amp|lt|gt|quot|#39|apos);/g, (match) => HTML_ENTITY_MAP[match] || match)
}

/**
 * Render card text that may contain HTML tags like <br>, <b>, <i>, etc.
 * from the One Piece TCG database. Also highlights OPTCG keywords.
 */
export function renderCardText(text: string | null | undefined): string {
  if (!text) return ''
  const sanitized = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: ['br', 'b', 'i', 'em', 'strong', 'span', 'u'],
    ALLOWED_ATTR: [],
  })
  return highlightKeywords(sanitized)
}

/**
 * Highlight OPTCG keywords in rendered HTML text.
 * Wraps keywords in a styled span without breaking existing HTML tags.
 * Keywords extracted from english/english-asia source data.
 */
function highlightKeywords(html: string): string {
  const keywords = [
    "DON!! -10", "DON!! -8", "DON!! -7", "DON!! -6", "DON!! -5",
    "DON!! -4", "DON!! -3", "DON!! -2", "DON!! -1",
    "DON!! x3", "DON!! x2", "DON!! x1",
    "Activate: Main",
    "On Your Opponent's Attack",
    "End of Your Turn",
    "Once Per Turn",
    "Double Attack",
    "Opponent's Turn",
    "Rush: Character",
    "When Attacking",
    "Unblockable",
    "Blocker",
    "Counter",
    "Trigger",
    "Banish",
    "On Block",
    "On K.O.",
    "On Play",
    "Your Turn",
    "Rush",
    "Main",
  ]

  // Build a single regex with all keywords (longest first to avoid partial matches)
  const pattern = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const regex = new RegExp(`(?<![\\w])(${pattern})(?![\\w])`, 'g')

  // Split into HTML tags and text segments, only replace in text
  return html
    .split(/(<[^>]+>)/g)
    .map((segment) =>
      segment.startsWith('<') ? segment : segment.replace(regex, '<span class="kw">$1</span>')
    )
    .join('')
}