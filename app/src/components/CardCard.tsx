import type { Card } from '../types'
import { COLOR_HEX, RARITY_SHORT, CATEGORY_COLORS } from '../types'
import { decodeHtmlEntities } from '../utils'
import { useAppStore } from '../store'

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
    case 'Ranged': return '#e74c3c'
    case 'Wisdom': return '#22c55e'
    case 'Special': return '#a855f7'
    default: return '#eab308'
  }
}

interface CardCardProps {
  card: Card
}

export default function CardCard({ card }: CardCardProps) {
  const setSelectedCard = useAppStore((state) => state.setSelectedCard)
  const primaryColor = card.colors[0] ? COLOR_HEX[card.colors[0]] : '#64748b'
  const categoryColor = CATEGORY_COLORS[card.category]

  // Build cost circle background: curved diagonal slash for multi-colored cards
  const costCircleBg =
    card.colors.length === 1
      ? { backgroundColor: primaryColor }
      : {
          background: `conic-gradient(from 225deg, ${card.colors.map((c, i) => `${COLOR_HEX[c]} ${i * 180}deg ${(i + 1) * 180}deg`).join(', ')})`,
        }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setSelectedCard(card)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedCard(card) }}
      className="group flex flex-col rounded-xl overflow-hidden bg-white dark:bg-[#1a1d2e] shadow-md shadow-black/5 dark:shadow-white/5 hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-white/10 transition-all cursor-pointer"
    >
      {/* Top strip: Cost | Power | Attribute */}
      <div className="flex items-center justify-between px-2 py-1.5 shrink-0 bg-slate-50 dark:bg-[#13151f]">
        {card.cost !== null ? (
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white shadow-sm"
            style={costCircleBg}
          >
            {card.cost}
          </span>
        ) : (
          <span className="w-6" />
        )}

        <div className="flex items-center gap-1.5">
          {card.power !== null && (
            <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">
              {card.power}
            </span>
          )}
          {card.attributes.length > 0 && (
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold shadow-sm"
              style={{ backgroundColor: getAttributeColor(card.attributes[0]) }}
            >
              {getAttributeIcon(card.attributes[0])}
            </span>
          )}
        </div>
      </div>

      {/* Image link centered */}
      {card.img_url && (
        <div className="shrink-0 py-2 flex items-center justify-center bg-slate-50/50 dark:bg-[#13151f]/50">
          <a
            href={card.img_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-[#1a1d2e] text-slate-400 dark:text-[#64748b] hover:text-[#3b82f6] shadow-sm hover:scale-110 transition-all"
            title="Open card image in new tab"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      )}

      {/* Effect -> Category -> Name -> Type */}
      <div className="flex-1 px-2.5 py-2 flex flex-col min-h-0">
        {/* Effect */}
        {card.effect && (
          <p className="text-[10px] text-slate-600 dark:text-[#94a3b8] leading-relaxed line-clamp-3">
            {stripHtml(decodeHtmlEntities(card.effect))}
          </p>
        )}

        {/* Category */}
        <div
          className={`text-[9px] font-bold tracking-wider uppercase text-center ${card.effect ? 'mt-2' : ''}`}
          style={categoryColor ? { color: categoryColor } : undefined}
        >
          {card.category === 'Don' ? 'DON!!' : card.category}
        </div>

        {/* Name */}
        <h3 className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white text-center leading-snug line-clamp-2">
          {decodeHtmlEntities(card.name)}
        </h3>

        {/* Types */}
        {card.types.length > 0 && (
          <div className="mt-0.5 text-[10px] text-center text-slate-500 dark:text-[#64748b] truncate">
            {card.types.join(' / ')}
          </div>
        )}

        {/* Counter — right-aligned at bottom of content area */}
        {card.counter !== null && (
          <div className="mt-auto pt-1 text-right">
            <span className="text-[9px] font-bold text-[#3498db]">＋{card.counter}</span>
          </div>
        )}
      </div>

      {/* Bottom banner — always black/dark */}
      <div className="shrink-0 px-2.5 py-1.5 bg-slate-900 dark:bg-black text-white flex items-center justify-between text-[10px]">
        <span className="font-mono">{card.id}</span>
        <div className="flex items-center gap-1">
          <span className="px-1 rounded bg-white/20 font-bold">
            {RARITY_SHORT[card.rarity] || card.rarity}
          </span>
          {card.block_number !== null && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 text-[9px] font-bold">
              {card.block_number}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
