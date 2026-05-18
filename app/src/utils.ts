import DOMPurify from 'dompurify'
import { COLOR_HEX } from './types'
import type { Card } from './types'

export function getExternalImageUrl(imgUrl: string): string {
  return `https://serveproxy.com/?url=${encodeURIComponent(imgUrl)}`
}

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
    "Activate: Main",
    "End of Your Turn",
    "Opponent's Turn",
    "Rush: Character",
    "Unblockable",
    "Trigger",
    "Banish",
    "On Block",
    "On K.O.",
    "Your Turn",
    "Rush",
  ]

  // Build a single regex with all keywords (longest first to avoid partial matches)
  const pattern = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const regex = new RegExp(`(?<![\\w])(${pattern})(?![\\w])`, 'g')

  // Split into HTML tags and text segments, only replace in text
  return html
    .split(/(<[^>]+>)/g)
    .map((segment) =>
      segment.startsWith('<')
        ? segment
        : segment
            .replace(/(?<![\w])\[Counter\](?![\w])/g, '<span class="kw-counter">Counter</span>')
            .replace(/(?<![\w])\[Main\](?![\w])/g, '<span class="kw-main">Main</span>')
            .replace(/(?<![\w])\[Blocker\](?![\w])/g, '<span class="kw-blocker">Blocker</span>')
            .replace(/(?<![\w])\[When Attacking\](?![\w])/g, '<span class="kw-when-attacking">When Attacking</span>')
            .replace(/(?<![\w])\[DON!! x(\d)\](?![\w])/g, '<span class="kw-don">DON!! x$1</span>')
            .replace(/(?<![\w])\[On Play\](?![\w])/g, '<span class="kw-on-play">On Play</span>')
            .replace(/(?<![\w])\[Once Per Turn\](?![\w])/g, '<span class="kw-once-per-turn">Once Per Turn</span>')
            .replace(/(?<![\w])\[On Your Opponent's Attack\](?![\w])/g, '<span class="kw-on-opponent-attack">On Your Opponent\'s Attack</span>')
            .replace(regex, '<span class="kw">$1</span>')
    )
    .join('')
}

/** Strip HTML tags from a string */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Get kanji icon for a card attribute */
export function getAttributeIcon(attr: string): string {
  switch (attr) {
    case 'Strike': return '打'
    case 'Slash': return '斬'
    case 'Ranged': return '射'
    case 'Wisdom': return '知'
    case 'Special': return '特'
    default: return attr.slice(0, 1)
  }
}

/** Get color hex for a card attribute */
export function getAttributeColor(attr: string): string {
  switch (attr) {
    case 'Strike': return '#eab308'
    case 'Slash': return '#3b82f6'
    case 'Ranged': return '#e74c3c'
    case 'Wisdom': return '#22c55e'
    case 'Special': return '#a855f7'
    default: return '#eab308'
  }
}

/** Use dark text for light/bright backgrounds (Yellow, Green) to meet WCAG AA */
export function getTextColorForBg(hex: string): string {
  const lightBgHexes = ['#f1c40f', '#eab308', '#2ecc71', '#22c55e']
  return lightBgHexes.includes(hex.toLowerCase()) ? 'text-[#1a1a2e]' : 'text-white'
}

/** Build cost circle background style for a card */
export function costCircleBg(card: Card): React.CSSProperties {
  const primaryColor = card.colors[0] ? COLOR_HEX[card.colors[0]] : '#64748b'
  return card.colors.length === 1
    ? { backgroundColor: primaryColor }
    : {
        background: `conic-gradient(from 225deg, ${card.colors.map((c, i) => `${COLOR_HEX[c]} ${i * 180}deg ${(i + 1) * 180}deg`).join(', ')})`,
      }
}