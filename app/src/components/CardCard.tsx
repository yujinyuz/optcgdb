import type { Card } from '../types'
import { COLOR_HEX, RARITY_SHORT, CATEGORY_COLORS } from '../types'
import { decodeHtmlEntities, getAttributeIcon, getAttributeColor, getTextColorForBg, costCircleBg, getExternalImageUrl } from '../utils'
import { useAppStore } from '../store'
import ImageLoader from './ImageLoader'

interface CardCardProps {
  card: Card
}

export default function CardCard({ card }: CardCardProps) {
  const setSelectedCard = useAppStore((state) => state.setSelectedCard)
  const loadExternalImages = useAppStore((state) => state.loadExternalImages)
  const primaryColor = card.colors[0] ? COLOR_HEX[card.colors[0]] : '#64748b'
  const categoryColor = CATEGORY_COLORS[card.category]

  const costBg = costCircleBg(card)

  return (
    <div
      role="button"
      aria-label={card.name}
      tabIndex={0}
      onClick={() => setSelectedCard(card)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedCard(card) }}
      className="group flex flex-col rounded-xl overflow-hidden bg-white dark:bg-[#1a1d2e] shadow-md shadow-black/5 dark:shadow-white/5 hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-white/10 active:scale-[0.98] transition-all duration-150 cursor-pointer"
    >
      {/* Top strip: Cost | Power | Attribute (only when no image) */}
      {(!loadExternalImages || !card.img_url) && (
      <div className="flex items-center justify-between px-2 py-1.5 shrink-0 bg-slate-50 dark:bg-[#13151f]">
        {card.cost !== null ? (
          <span
            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shadow-sm ${getTextColorForBg(primaryColor)}`}
            style={costBg}
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
              className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shadow-sm ${getTextColorForBg(getAttributeColor(card.attributes[0]))}`}
              style={{ backgroundColor: getAttributeColor(card.attributes[0]) }}
            >
              {getAttributeIcon(card.attributes[0])}
            </span>
          )}
        </div>
      </div>
      )}

      {/* Card image or link */}
      {loadExternalImages && card.img_url ? (
        <div className="shrink-0 bg-slate-50 dark:bg-[#13151f] relative">
          <ImageLoader
            src={getExternalImageUrl(card.img_url)}
            alt={card.name}
            className="w-full aspect-[5/7] object-cover"
          />
        </div>
      ) : card.img_url && (
        <div className="shrink-0 py-2 flex items-center justify-center bg-slate-50/50 dark:bg-[#13151f]/50">
          <a
            href={card.img_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="hover:scale-105 transition-all"
            title="Open card image in new tab"
          >
            <img src="/loading-logo.webp" alt="" className="w-10 opacity-50 dark:invert" />
          </a>
        </div>
      )}

      {/* Effect -> Category -> Name -> Type */}
      <div className="flex-1 px-2.5 py-2 flex flex-col min-h-0">
        {/* Category */}
        <div
          className="text-[10px] font-bold tracking-[0.3em] uppercase text-center"
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
        {(!loadExternalImages && card.counter !== null) && (
          <div className="mt-auto pt-1 text-right">
            <span className="text-[10px] font-bold text-[#3498db]">＋{card.counter}</span>
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
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 text-[10px] font-bold">
              {card.block_number}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
