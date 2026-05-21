import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getCardById, getCardPacks, getCardVariants } from '../db'
import { useAppStore } from '../store'
import type { Card } from '../types'
import { COLOR_HEX, RARITY_SHORT, CATEGORY_COLORS } from '../types'
import { decodeHtmlEntities, renderCardText, getAttributeIcon, getAttributeColor, getTextColorForBg, costCircleBg, groupImagesByLanguage } from '../utils'

export default function CardDetail() {
  const { id } = useParams<{ id: string }>()
  const preferredLanguage = useAppStore((state) => state.preferredLanguage)
  const loadExternalImages = useAppStore((state) => state.loadExternalImages)

  const [card, setCard] = useState<Card | null>(null)
  const [cardPacks, setCardPacks] = useState<{ packId: string; label: string; rawTitle: string }[]>([])
  const [cardVariants, setCardVariants] = useState<{ card: Card; images: { language: string; imgUrl: string | null }[]; packs: { title: string; language: string }[] }[]>([])
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
        const result = await getCardById(id!, preferredLanguage)
        if (cancelled) return
        setCard(result)

        if (result) {
          const [packs, variantsResult] = await Promise.all([
            getCardPacks(result.id),
            getCardVariants(result.base_id),
          ])
          if (cancelled) return
          setCardPacks(packs)
          setCardVariants(variantsResult.variants)
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
  }, [id, preferredLanguage])

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
  const costBg = costCircleBg(card)

  const categoryColor = CATEGORY_COLORS[card.category]

  // Pick best image URL based on language preference
  const languagePriority: Record<string, number> = preferredLanguage === 'japanese'
    ? { japanese: 0, 'english-asia': 0, english: 1 }
    : { english: 0, 'english-asia': 1, japanese: 2 }
  const bestImageUrl = cardVariants
    .flatMap((v) => v.images)
    .filter((img): img is { language: string; imgUrl: string } => !!img.imgUrl)
    .sort((a, b) => (languagePriority[a.language] ?? 3) - (languagePriority[b.language] ?? 3))[0]?.imgUrl ?? null

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
      <div
        className="rounded-2xl overflow-hidden bg-white dark:bg-[#1a1d2e] shadow-xl shadow-black/10 dark:shadow-black/30"
      >
        {/* Top strip: Cost | Power | Attribute */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          {card.cost !== null ? (
            <span
              className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold shadow-md ${getTextColorForBg(primaryColor)}`}
              style={costBg}
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
              <div className={`inline-flex items-center ${card.attributes.length > 1 ? 'divide-x divide-white/20' : ''}`}>
                {card.attributes.map((attr, i) => (
                  <span
                    key={attr}
                    className={`inline-flex items-center justify-center w-8 h-8 text-sm font-bold ${getTextColorForBg(getAttributeColor(attr))} ${card.attributes.length === 1 ? 'rounded-full' : i === 0 ? 'rounded-l-full' : 'rounded-r-full'}`}
                    style={{ backgroundColor: getAttributeColor(attr) }}
                  >
                    {getAttributeIcon(attr)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Image link — centered icon */}
        {bestImageUrl && (
          <div className="flex items-center justify-center py-4">
            <a
              href={bestImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-14 h-14 rounded-full bg-white dark:bg-[#1a1d2e] text-slate-400 dark:text-[#64748b] hover:text-[#3b82f6] shadow-md hover:scale-110 transition-all"
              title="Open card image in new tab"
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}

        {/* Card Effect */}
        {card.effect && (
          <div className="px-4 pb-3">
            <div className="mt-3 rounded-xl bg-white dark:bg-[#0f1117] p-4">
              <div
                className="text-sm text-slate-900 dark:text-white leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderCardText(card.effect) }}
              />
              {/* Trigger — inline with effect */}
              {card.trigger_text && (
                <div
                  className="mt-2 text-sm text-slate-700 dark:text-[#94a3b8] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderCardText(card.trigger_text) }}
                />
              )}
            </div>

          </div>
        )}

        {/* Header: Category -> Name -> Type */}
        <div className="px-4 pb-3">
          {/* Category */}
          <div
            className="text-xs font-medium tracking-[0.3em] uppercase text-center"
            style={categoryColor ? { color: categoryColor } : undefined}
          >
            {card.category === 'Don' ? 'DON!!' : card.category}
          </div>

          {/* Name */}
          <h1 className="mt-1 text-2xl text-slate-900 dark:text-white text-center leading-tight card-name">
            {decodeHtmlEntities(card.name)}{card.id !== card.base_id && <span className="text-sm font-normal text-slate-400 dark:text-[#64748b]">{card.id.match(/_p\d+$/) ? ' (Parallel)' : card.id.match(/_r\d+$/) ? ' (Reprint)' : ''}</span>}
          </h1>

          {/* Types */}
          {card.types.length > 0 && (
            <div className="mt-1 text-sm text-center text-slate-500 dark:text-[#94a3b8] truncate">
              {card.types.join(' / ')}
            </div>
          )}
        </div>

        {/* Bottom banner: ID | Counter | Rarity | Block */}
        <div className="px-4 py-3 bg-slate-900 dark:bg-black text-white">
          <div className="flex items-center justify-between text-sm opacity-90">
            <span className="font-mono">{card.id}</span>
            <div className="flex items-center gap-2">
              {card.counter !== null && (
                <span className="text-[10px] font-bold text-[#3498db]">⚡ +{card.counter}</span>
              )}
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

      {/* Price links */}
      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
        <span className="text-[11px] text-slate-500 dark:text-[#64748b] uppercase tracking-wider font-semibold shrink-0">Price</span>
        <a
          href={`https://www.mercardop.jp/product-list?keyword=${encodeURIComponent(card.base_id)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] tracking-wider uppercase bg-white dark:bg-[#1a1d2e] border border-slate-200 dark:border-[#2e303a] rounded-md px-2 py-1 text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:border-[#3b82f6] hover:-translate-y-0.5 hover:shadow-sm transition-all"
          style={{ transition: 'box-shadow 150ms var(--ease-out-quart), transform 150ms var(--ease-out-quart), border-color 150ms, color 150ms' }}
        >
          <img src="/icons/mercard.png" alt="" className="w-4 h-4 rounded-sm shrink-0" />
          Mercard
        </a>
        <a
          href={`https://yuyu-tei.jp/sell/opc/s/search?search_word=${encodeURIComponent(card.base_id)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] tracking-wider uppercase bg-white dark:bg-[#1a1d2e] border border-slate-200 dark:border-[#2e303a] rounded-md px-2 py-1 text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:border-[#3b82f6] hover:-translate-y-0.5 hover:shadow-sm transition-all"
          style={{ transition: 'box-shadow 150ms var(--ease-out-quart), transform 150ms var(--ease-out-quart), border-color 150ms, color 150ms' }}
        >
          <img src="/icons/yuyutei.png" alt="" className="w-4 h-4 rounded-sm shrink-0" />
          Yuyu-Tei
        </a>
        <a
          href={`https://www.tcgplayer.com/search/one-piece-card-game/product?q=${encodeURIComponent(card.base_id)}&view=grid&productLineName=one-piece-card-game`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] tracking-wider uppercase bg-white dark:bg-[#1a1d2e] border border-slate-200 dark:border-[#2e303a] rounded-md px-2 py-1 text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:border-[#3b82f6] hover:-translate-y-0.5 hover:shadow-sm transition-all"
          style={{ transition: 'box-shadow 150ms var(--ease-out-quart), transform 150ms var(--ease-out-quart), border-color 150ms, color 150ms' }}
        >
          <img src="/icons/tcgplayer.png" alt="" className="w-4 h-4 rounded-sm shrink-0" />
          TCGPlayer
        </a>
        <a
          href={`https://www.cardrush-op.jp/product-list?keyword=${encodeURIComponent(card.base_id)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] tracking-wider uppercase bg-white dark:bg-[#1a1d2e] border border-slate-200 dark:border-[#2e303a] rounded-md px-2 py-1 text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:border-[#3b82f6] hover:-translate-y-0.5 hover:shadow-sm transition-all"
          style={{ transition: 'box-shadow 150ms var(--ease-out-quart), transform 150ms var(--ease-out-quart), border-color 150ms, color 150ms' }}
        >
          <img src="/icons/cardrush.png" alt="" className="w-4 h-4 rounded-sm shrink-0" />
          CardRush
        </a>
      </div>

      {/* Image variants / alternate arts */}
      {cardVariants.length > 0 && loadExternalImages && (
        <div className="mt-4">
          <h3 className="text-[11px] text-slate-500 dark:text-[#64748b] uppercase tracking-wider font-semibold mb-2">
            Alternate arts
          </h3>
          <div className="space-y-3">
            {(() => {
              const { english, japanese } = groupImagesByLanguage(cardVariants, card.id)
              return (
                <>
                  {english.length > 0 && (
                    <div>
                      <div className="text-[10px] text-slate-400 dark:text-[#64748b] uppercase tracking-wider font-semibold mb-1.5">English</div>
                      <div className="flex flex-wrap gap-1.5">
                        {english.map((img) => (
                          <a
                            key={img.imgUrl}
                            href={img.imgUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs bg-white dark:bg-[#1a1d2e] border border-slate-200 dark:border-[#2e303a] rounded-md px-2.5 py-1 text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:border-[#3b82f6] transition-all"
                          >
                            {img.packName || 'Alt'}
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {japanese.length > 0 && (
                    <div>
                      <div className="text-[10px] text-slate-400 dark:text-[#64748b] uppercase tracking-wider font-semibold mb-1.5">Japanese</div>
                      <div className="flex flex-wrap gap-1.5">
                        {japanese.map((img) => (
                          <a
                            key={img.imgUrl}
                            href={img.imgUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs bg-white dark:bg-[#1a1d2e] border border-slate-200 dark:border-[#2e303a] rounded-md px-2.5 py-1 text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:border-[#3b82f6] transition-all"
                          >
                            {img.packName || 'Alt'}
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}

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
                    title={pack.label}
                  >
                    {pack.rawTitle}
                  </span>
                ))}
          </div>
        </div>
      )}
    </div>
  )
}
