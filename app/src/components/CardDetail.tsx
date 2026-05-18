import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getCardById, getCardPacks, getCardVariants, getRelatedCards } from '../db'
import type { Card } from '../types'
import { COLOR_HEX, RARITY_SHORT } from '../types'
import { decodeHtmlEntities, renderCardText } from '../utils'

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

export default function CardDetail() {
  const { id } = useParams<{ id: string }>()

  const [card, setCard] = useState<Card | null>(null)
  const [cardPacks, setCardPacks] = useState<{ packId: string; label: string; rawTitle: string }[]>([])
  const [cardVariants, setCardVariants] = useState<{ card: Card; images: { language: string; imgUrl: string | null }[] }[]>([])
  const [relatedCards, setRelatedCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadCard() {
      if (!id) {
        if (!cancelled) {
          setError('Missing card ID')
          setLoading(false)
        }
        return
      }

      try {
        const result = await getCardById(id!)
        if (cancelled) return
        setCard(result)

        if (result) {
          const [packs, variants, related] = await Promise.all([
            getCardPacks(result.id),
            getCardVariants(result.id),
            getRelatedCards(result.id, result.types, 8),
          ])
          if (cancelled) return
          setCardPacks(packs)
          setCardVariants(variants)
          setRelatedCards(related)
        }

        if (!cancelled) setLoading(false)
      } catch (err) {
        if (!cancelled) {
          setError(String(err))
          setLoading(false)
        }
      }
    }

    loadCard()
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-slate-200 dark:border-[#2e303a] border-t-[#3b82f6] rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !card) {
    return (
      <div className="py-20 text-center">
        <div className="text-4xl mb-3">🏴‍☠️</div>
        <div className="text-slate-500 dark:text-[#64748b] text-sm">{error || 'Card not found'}</div>
        <Link to="/" className="mt-4 inline-block text-[#3b82f6] dark:text-[#60a5fa] text-sm hover:underline">
          Back to search
        </Link>
      </div>
    )
  }

  const primaryColor = card.colors[0] ? COLOR_HEX[card.colors[0]] : '#64748b'
  const baseId = card.id.replace(/_[pr]\d+$/, '')

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Back link */}
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white mb-4 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      {/* Card — matches tile layout but expanded */}
      <div className="rounded-2xl overflow-hidden border-2 bg-white dark:bg-[#1a1d2e]" style={{ borderColor: primaryColor }}>
        {/* Top strip: Cost | Power | Attribute */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          {card.cost !== null ? (
            <span
              className="inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold text-white shadow-md"
              style={{ backgroundColor: primaryColor }}
            >
              {card.cost}
            </span>
          ) : (
            <span className="w-10" />
          )}

          <div className="flex items-center gap-2">
            {card.power !== null && (
              <span className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                {card.power}
              </span>
            )}
            {card.attributes.length > 0 && (
              <span
                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold shadow-sm"
                style={{ backgroundColor: getAttributeColor(card.attributes[0]) }}
              >
                {getAttributeIcon(card.attributes[0])}
              </span>
            )}
          </div>
        </div>

        {/* Body: Name + Effect */}
        <div className="px-4 pb-3">
          {/* Name */}
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center leading-tight">
            {decodeHtmlEntities(card.name)}
          </h1>

          {/* Effect */}
          {card.effect && (
            <div className="mt-3 rounded-xl border border-slate-200 dark:border-[#2e303a] bg-slate-50 dark:bg-[#13151f] p-4">
              <div
                className="text-sm text-slate-800 dark:text-[#e2e8f0] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderCardText(card.effect) }}
              />
            </div>
          )}

          {/* Trigger */}
          {card.trigger_text && (
            <div className="mt-3">
              <div className="text-[10px] font-bold text-slate-400 dark:text-[#64748b] uppercase tracking-wider mb-1">
                Trigger
              </div>
              <div
                className="text-sm text-slate-700 dark:text-[#94a3b8] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderCardText(card.trigger_text) }}
              />
            </div>
          )}

          {/* Counter — inline, right-aligned */}
          {card.counter !== null && (
            <div className="mt-2 text-right">
              <span className="text-xs font-bold text-[#3498db]">＋{card.counter}</span>
            </div>
          )}
        </div>

        {/* Bottom banner: Category | Types | ID | Rarity | Block */}
        <div className="px-4 py-3 text-white" style={{ backgroundColor: primaryColor }}>
          <div className="text-xs font-bold tracking-[0.15em] uppercase text-center opacity-95">
            {card.category === 'Don' ? 'DON!!' : card.category}
          </div>

          {card.types.length > 0 && (
            <div className="mt-1 text-sm text-center opacity-90 truncate">
              {card.types.join(' / ')}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between text-sm opacity-90">
            <span className="font-mono">{card.id}</span>
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-white/20">
                {RARITY_SHORT[card.rarity] || card.rarity}
              </span>
              {card.block_number !== null && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-xs font-bold">
                  {card.block_number}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image variants */}
      {cardVariants.length > 0 && (
        <div className="mt-4 space-y-2">
          {cardVariants.map((variant) => (
            <div key={variant.card.id} className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-slate-500 dark:text-[#64748b] uppercase tracking-wider font-semibold shrink-0">
                {variant.card.id === card.id ? 'Image' : variant.card.id.replace(card.id, '').replace(/^_/, '') || 'Alt'}
              </span>
              {variant.images.length > 0 ? (
                variant.images.map((img) => (
                  <a
                    key={img.language}
                    href={img.imgUrl || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs bg-white dark:bg-[#1a1d2e] border border-slate-200 dark:border-[#2e303a] rounded-md px-2.5 py-1 text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:border-[#3b82f6] transition-all"
                  >
                    {img.language === 'english-asia' ? 'Asia' : img.language === 'japanese' ? 'JP' : 'EN'}
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))
              ) : (
                <span className="text-[10px] text-slate-400 dark:text-[#64748b]">No images</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Price links */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[11px] text-slate-500 dark:text-[#64748b] uppercase tracking-wider font-semibold shrink-0">Price</span>
        <a
          href={`https://www.mercardop.jp/product-list?keyword=${encodeURIComponent(baseId)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs bg-white dark:bg-[#1a1d2e] border border-slate-200 dark:border-[#2e303a] rounded-md px-2.5 py-1 text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:border-[#3b82f6] transition-all"
        >
          mercard
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <a
          href={`https://yuyu-tei.jp/sell/opc/s/search?search_word=${encodeURIComponent(baseId)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs bg-white dark:bg-[#1a1d2e] border border-slate-200 dark:border-[#2e303a] rounded-md px-2.5 py-1 text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:border-[#3b82f6] transition-all"
        >
          yuyu-tei
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Packs */}
      {cardPacks.length > 0 && (
        <div className="mt-4">
          <h3 className="text-[11px] text-slate-500 dark:text-[#64748b] uppercase tracking-wider font-semibold mb-2">
            Found in
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {cardPacks.map((pack) => (
              <span
                key={pack.packId}
                className="text-[11px] bg-slate-100 dark:bg-[#13151f] border border-slate-200 dark:border-[#2e303a] rounded-md px-2 py-0.5 text-slate-600 dark:text-[#94a3b8]"
                title={pack.rawTitle}
              >
                {pack.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Related cards */}
      {relatedCards.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
            Related cards
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {relatedCards.map((related) => (
              <Link
                key={related.id}
                to={`/card/${related.id}`}
                className="shrink-0 w-32 rounded-lg border border-slate-200 dark:border-[#2e303a] bg-white dark:bg-[#1a1d2e] p-2 hover:border-[#3b82f6] transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-slate-400 dark:text-[#64748b]">{related.id}</span>
                  {related.cost !== null && (
                    <span
                      className="w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                      style={{ backgroundColor: COLOR_HEX[related.colors[0]] || '#64748b' }}
                    >
                      {related.cost}
                    </span>
                  )}
                </div>
                <div className="text-xs font-medium text-slate-900 dark:text-white line-clamp-2 leading-snug">
                  {decodeHtmlEntities(related.name)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
