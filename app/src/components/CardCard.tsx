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
      <div className="flex flex-1 min-h-0">
        {/* Counter — tiny vertical strip on left edge */}
        {card.counter !== null && (
          <div className="shrink-0 w-3.5 flex items-center justify-center">
            <span
              className="text-[7px] font-bold text-[#3498db] tracking-tight"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              ＋{card.counter}
            </span>
          </div>
        )}

        <div className="flex-1 flex flex-col min-h-0">
          {/* Top strip: Cost | Power | Attribute — fixed height */}
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
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500 text-white text-xs font-bold shadow-sm">
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
      </div>

      {/* Bottom banner: Category | Types | ID/Block — fixed height, always at bottom */}
      <div
        className="shrink-0 px-3 py-2 text-white"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="text-[9px] font-bold tracking-[0.15em] uppercase text-center opacity-90">
          {card.category === 'Don' ? 'DON!!' : card.category}
        </div>

        {card.types.length > 0 && (
          <div className="mt-0.5 text-[10px] text-center opacity-80 truncate">
            {card.types.join(' / ')}
          </div>
        )}

        <div className="mt-1.5 flex items-center justify-between text-[9px] opacity-70">
          <span className="font-mono">{card.id}</span>
          <div className="flex items-center gap-1.5">
            <span className="px-1 rounded text-[8px] font-bold bg-white/20">
              {RARITY_SHORT[card.rarity] || card.rarity}
            </span>
            {card.block_number !== null && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 text-[8px] font-bold">
                {card.block_number}
              </span>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
    </Link>
  )
}
