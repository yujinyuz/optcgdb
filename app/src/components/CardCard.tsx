import { Link } from 'react-router-dom'
import type { Card } from '../types'
import { COLOR_HEX, RARITY_SHORT } from '../types'
import { decodeHtmlEntities } from '../utils'

function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'Common': return '#64748b'
    case 'Uncommon': return '#475569'
    case 'Rare': return '#3b82f6'
    case 'SuperRare': return '#a855f7'
    case 'SecretRare': return '#eab308'
    case 'Leader': return '#e74c3c'
    case 'Special': return '#ec4899'
    case 'TreasureRare': return '#f59e0b'
    case 'Promo': return '#22c55e'
    default: return '#64748b'
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function getCategoryIcon(category: string): string {
  switch (category) {
    case 'Leader': return '👑'
    case 'Character': return '⚔'
    case 'Event': return '⚡'
    case 'Stage': return '🏰'
    case 'Don': return '💎'
    default: return ''
  }
}

interface CardCardProps {
  card: Card
}

export default function CardCard({ card }: CardCardProps) {
  const rarityColor = getRarityColor(card.rarity)
  const primaryColor = card.colors[0] ? COLOR_HEX[card.colors[0]] : '#64748b'
  const isLeader = card.category === 'Leader'

  return (
    <Link
      to={`/card/${card.id}`}
      className="group block rounded-xl overflow-hidden border border-slate-200 dark:border-[#2e303a] hover:border-slate-300 dark:hover:border-[#3e4050] hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 transition-all bg-white dark:bg-[#1a1d2e]"
    >
      {/* Color strip at top */}
      <div
        className="h-1.5 w-full"
        style={{
          background: card.colors.length > 1
            ? `linear-gradient(90deg, ${card.colors.map(c => COLOR_HEX[c] || c).join(', ')})`
            : primaryColor
        }}
      />

      {/* Text-based card tile */}
      <div className="p-3 aspect-[2/3] flex flex-col">
        {/* Top row: cost badge + rarity + category */}
        <div className="flex items-start justify-between gap-1.5 mb-1.5">
          <div className="flex items-center gap-1.5">
            {card.cost !== null && (
              <span
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold text-white shrink-0"
                style={{ backgroundColor: '#f1c40f' }}
              >
                {card.cost}
              </span>
            )}
            <span className="text-xs" title={card.category}>{getCategoryIcon(card.category)}</span>
          </div>
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white shrink-0"
            style={{ backgroundColor: rarityColor }}
          >
            {RARITY_SHORT[card.rarity] || card.rarity}
          </span>
        </div>

        {/* Card name */}
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2 mb-1.5">
          {decodeHtmlEntities(card.name)}
        </h3>

        {/* ID + colors */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[10px] font-mono text-slate-400 dark:text-[#64748b]">{card.id}</span>
          {card.colors.length > 0 && (
            <div className="flex items-center gap-0.5">
              {card.colors.map((color) => (
                <span
                  key={color}
                  className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20 dark:ring-black/20"
                  style={{ backgroundColor: COLOR_HEX[color] || color }}
                  title={color}
                />
              ))}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-[#94a3b8]">
          {card.power !== null && (
            <span className="flex items-center gap-0.5">
              <span className="text-[#e74c3c] font-bold">⚔</span>
              <span>{isLeader ? card.power : card.power}</span>
            </span>
          )}
          {card.counter !== null && (
            <span className="flex items-center gap-0.5">
              <span className="text-[#3498db] font-bold">＋</span>
              <span>{card.counter}</span>
            </span>
          )}
          {card.attributes.length > 0 && (
            <span className="text-slate-400 dark:text-[#64748b] truncate">
              {card.attributes.join('/')}
            </span>
          )}
        </div>

        {/* Effect text */}
        {card.effect && (
          <p className="mt-2 text-[11px] text-slate-600 dark:text-[#94a3b8] leading-relaxed line-clamp-3">
            {stripHtml(decodeHtmlEntities(card.effect))}
          </p>
        )}

        {/* Types + Block - pushed to bottom with flex-grow */}
        <div className="flex-1" />
        <div className="mt-2 flex items-center justify-between gap-1.5 text-[10px] text-slate-400 dark:text-[#64748b]">
          {card.types.length > 0 && (
            <span className="truncate">{card.types.join(' · ')}</span>
          )}
          {card.block_number !== null && (
            <span className="inline-flex items-center justify-center w-5 h-5 shrink-0 rounded-full font-mono font-bold text-white bg-slate-500 dark:bg-[#3e4050]">
              {card.block_number}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}