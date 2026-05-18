import { Link } from 'react-router-dom'
import type { Card } from '../types'
import { COLOR_HEX, RARITY_SHORT } from '../types'
import { decodeHtmlEntities } from '../utils'

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function getAttributeIcon(attr: string): string {
  switch (attr) {
    case 'Strike': return '打'
    case 'Slash': return '斬'
    case 'Ranged': return '射'
    case 'Wisdom': return '知'
    case 'Special': return '特'
    default: return attr.slice(0, 1)
  }
}

function getAttributeColor(attr: string): string {
  switch (attr) {
    case 'Strike': return '#eab308'
    case 'Slash': return '#3b82f6'
    case 'Ranged': return '#22c55e'
    case 'Wisdom': return '#a855f7'
    case 'Special': return '#e74c3c'
    default: return '#eab308'
  }
}

interface CardCardProps {
  card: Card
}

export default function CardCard({ card }: CardCardProps) {
  const primaryColor = card.colors[0] ? COLOR_HEX[card.colors[0]] : '#64748b'

  return (
    <Link
      to={`/card/${card.id}`}
      className="group flex flex-col rounded-xl overflow-hidden border-2 bg-white dark:bg-[#1a1d2e] hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 transition-all"
      style={{ borderColor: primaryColor }}
    >
      {/* Top strip: Cost | Power | Attribute */}
      <div className="flex items-center justify-between px-2.5 py-2 shrink-0">
        {card.cost !== null ? (
          <span
            className="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold text-white shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            {card.cost}
          </span>
        ) : (
          <span className="w-7" />
        )}

        <div className="flex items-center gap-1.5">
          {card.power !== null && (
            <span className="text-lg font-bold text-slate-900 dark:text-white leading-none">
              {card.power}
            </span>
          )}
          {card.attributes.length > 0 && (
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold shadow-sm"
              style={{ backgroundColor: getAttributeColor(card.attributes[0]) }}
            >
              {getAttributeIcon(card.attributes[0])}
            </span>
          )}
        </div>
      </div>

      {/* Name + Effect */}
      <div className="flex-1 px-3 pb-2 flex flex-col min-h-0">
        {/* Name */}
        <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
          {decodeHtmlEntities(card.name)}
        </h3>

        {/* Effect */}
        {card.effect && (
          <p className="mt-1.5 text-[10px] text-slate-600 dark:text-[#94a3b8] leading-relaxed line-clamp-2">
            {stripHtml(decodeHtmlEntities(card.effect))}
          </p>
        )}

        {/* Counter — tiny, right-aligned at bottom of content area */}
        {card.counter !== null && (
          <div className="mt-auto pt-1 text-right">
            <span className="text-[9px] font-bold text-[#3498db]">＋{card.counter}</span>
          </div>
        )}
      </div>

      {/* Bottom banner */}
      <div
        className="shrink-0 px-3 py-2 text-white"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="text-xs font-bold tracking-[0.15em] uppercase text-center opacity-95">
          {card.category === 'Don' ? 'DON!!' : card.category}
        </div>

        {card.types.length > 0 && (
          <div className="mt-0.5 text-xs text-center opacity-90 truncate">
            {card.types.join(' / ')}
          </div>
        )}

        <div className="mt-1.5 flex items-center justify-between text-xs opacity-90">
          <span className="font-mono">{card.id}</span>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/20">
              {RARITY_SHORT[card.rarity] || card.rarity}
            </span>
            {card.block_number !== null && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-[10px] font-bold">
                {card.block_number}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
