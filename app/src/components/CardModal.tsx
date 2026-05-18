import { useEffect, useState, useCallback, useRef } from 'react'
import { getCardById, getCardPacks, getCardVariants } from '../db'
import { useAppStore } from '../store'
import type { Card } from '../types'
import { COLOR_HEX, RARITY_SHORT, CATEGORY_COLORS } from '../types'
import { decodeHtmlEntities, renderCardText, getAttributeIcon, getAttributeColor, getTextColorForBg, costCircleBg } from '../utils'

interface CardModalProps {
  cardId: string
  onClose: () => void
}

export default function CardModal({ cardId, onClose }: CardModalProps) {
  const [card, setCard] = useState<Card | null>(null)
  const [cardPacks, setCardPacks] = useState<{ packId: string; label: string; rawTitle: string }[]>([])
  const [cardVariants, setCardVariants] = useState<{ card: Card; images: { language: string; imgUrl: string | null }[] }[]>([])
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const cards = useAppStore((state) => state.cards)
  const setSelectedCard = useAppStore((state) => state.setSelectedCard)
  const preferredLanguage = useAppStore((state) => state.preferredLanguage)

  const currentIndex = cards.findIndex((c) => c.id === cardId)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < cards.length - 1

  const goPrev = useCallback(() => {
    if (hasPrev) setSelectedCard(cards[currentIndex - 1])
  }, [hasPrev, currentIndex, cards, setSelectedCard])

  const goNext = useCallback(() => {
    if (hasNext) setSelectedCard(cards[currentIndex + 1])
  }, [hasNext, currentIndex, cards, setSelectedCard])

  useEffect(() => {
    let cancelled = false

    async function loadCard() {
      try {
        const result = await getCardById(cardId, preferredLanguage)
        if (cancelled) return
        setCard(result)

        if (result) {
          const [packs, variants] = await Promise.all([
            getCardPacks(result.id),
            getCardVariants(result.id, preferredLanguage),
          ])
          if (cancelled) return
          setCardPacks(packs)
          setCardVariants(variants)
        }

        if (!cancelled) setLoading(false)
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    loadCard()
    return () => { cancelled = true }
  }, [cardId])

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0
  }, [cardId])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') handleClose()
    if (e.key === 'ArrowLeft') goPrev()
    if (e.key === 'ArrowRight') goNext()
  }, [onClose, goPrev, goNext])

  function handleClose() {
    setClosing(true)
    setTimeout(onClose, 150)
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${scrollbarWidth}px`
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [handleKeyDown])

  const overlayStyle = closing
    ? { animation: 'modalOverlayOut 150ms var(--ease-out-quart) forwards' }
    : { animation: 'modalOverlayIn 150ms var(--ease-out-quart) forwards' }

  let inner: React.ReactNode
  if (loading) {
    inner = <div className="w-8 h-8 border-2 border-slate-200 dark:border-[#2e303a] border-t-[#3b82f6] rounded-full animate-spin" />
  } else if (!card) {
    inner = (
      <div className="bg-white dark:bg-[#1a1d2e] rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">🏴‍☠️</div>
        <div className="text-slate-500 dark:text-[#64748b] text-sm">Card not found</div>
      </div>
    )
  } else {
  const primaryColor = card.colors[0] ? COLOR_HEX[card.colors[0]] : '#64748b'
  const costBg = costCircleBg(card)

  const baseId = card.id.replace(/_[pr]\d+$/, '')
  const categoryColor = CATEGORY_COLORS[card.category]

  const languagePriority: Record<string, number> = preferredLanguage === 'japanese'
    ? { japanese: 0, 'english-asia': 0, english: 1 }
    : { english: 0, 'english-asia': 1, japanese: 2 }
  const bestImageUrl = cardVariants
    .flatMap((v) => v.images)
    .filter((img): img is { language: string; imgUrl: string } => !!img.imgUrl)
    .sort((a, b) => (languagePriority[a.language] ?? 3) - (languagePriority[b.language] ?? 3))[0]?.imgUrl ?? null

  inner = (
    <>
      {/* Prev arrow */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev() }}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/90 dark:bg-black/60 text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white shadow-lg hover:scale-105 transition-all"
          aria-label="Previous card"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Next arrow */}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext() }}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/90 dark:bg-black/60 text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white shadow-lg hover:scale-105 transition-all"
          aria-label="Next card"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      <div
        ref={contentRef}
        className="relative w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#1a1d2e] shadow-2xl animate-[modalContentIn_200ms_var(--ease-out-expo)]"
        onClick={(e) => e.stopPropagation()}
        style={closing ? { animation: 'modalContentOut 150ms var(--ease-out-quart) forwards' } : undefined}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-slate-400 dark:text-[#64748b] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a1d2e] transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="px-4 py-6">
          {/* Card content */}
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
                  <span
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shadow-sm ${getTextColorForBg(getAttributeColor(card.attributes[0]))}`}
                    style={{ backgroundColor: getAttributeColor(card.attributes[0]) }}
                  >
                    {getAttributeIcon(card.attributes[0])}
                  </span>
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
                  className="flex items-center justify-center w-14 h-14 rounded-full bg-white dark:bg-[#1a1d2e] text-slate-400 dark:text-[#64748b] hover:text-[#3b82f6] shadow-md hover:scale-105 transition-all"
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
                </div>

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

                {card.counter !== null && (
                  <div className="mt-2 text-right">
                    <span className="text-xs font-bold text-[#3498db]">＋{card.counter}</span>
                  </div>
                )}
              </div>
            )}

            {/* Header: Category -> Name -> Type */}
            <div className="px-4 pb-3">
              <div
                className="text-xs font-bold tracking-[0.15em] uppercase text-center"
                style={categoryColor ? { color: categoryColor } : undefined}
              >
                {card.category === 'Don' ? 'DON!!' : card.category}
              </div>

              <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white text-center leading-tight">
                {decodeHtmlEntities(card.name)}
              </h1>

              {card.types.length > 0 && (
                <div className="mt-1 text-sm text-center text-slate-500 dark:text-[#94a3b8] truncate">
                  {card.types.join(' / ')}
                </div>
              )}
            </div>

            {/* Bottom banner */}
            <div className="px-4 py-3 bg-slate-900 dark:bg-black text-white">
              <div className="flex items-center justify-between text-sm opacity-90">
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

          {/* Price links */}
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            <span className="text-[11px] text-slate-500 dark:text-[#64748b] uppercase tracking-wider font-semibold shrink-0">Price</span>
            <a
              href={`https://www.mercardop.jp/product-list?keyword=${encodeURIComponent(baseId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] tracking-wider uppercase bg-white dark:bg-[#1a1d2e] border border-slate-200 dark:border-[#2e303a] rounded-md px-2 py-1 text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:border-[#3b82f6] transition-all"
            >
              <img src="/icons/mercard.png" alt="" className="w-4 h-4 rounded-sm shrink-0" />
              Mercard
            </a>
            <a
              href={`https://yuyu-tei.jp/sell/opc/s/search?search_word=${encodeURIComponent(baseId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] tracking-wider uppercase bg-white dark:bg-[#1a1d2e] border border-slate-200 dark:border-[#2e303a] rounded-md px-2 py-1 text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:border-[#3b82f6] transition-all"
            >
              <img src="/icons/yuyutei.png" alt="" className="w-4 h-4 rounded-sm shrink-0" />
              Yuyu-Tei
            </a>
            <a
              href={`https://www.tcgplayer.com/search/one-piece-card-game/product?q=${encodeURIComponent(baseId)}&view=grid&productLineName=one-piece-card-game`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] tracking-wider uppercase bg-white dark:bg-[#1a1d2e] border border-slate-200 dark:border-[#2e303a] rounded-md px-2 py-1 text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:border-[#3b82f6] transition-all"
            >
              <img src="/icons/tcgplayer.png" alt="" className="w-4 h-4 rounded-sm shrink-0" />
              TCGPlayer
            </a>
            <a
              href={`https://www.cardrush-op.jp/product-list?keyword=${encodeURIComponent(baseId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] tracking-wider uppercase bg-white dark:bg-[#1a1d2e] border border-slate-200 dark:border-[#2e303a] rounded-md px-2 py-1 text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:border-[#3b82f6] transition-all"
            >
              <img src="/icons/cardrush.png" alt="" className="w-4 h-4 rounded-sm shrink-0" />
              CardRush
            </a>
          </div>

          {/* Image variants / alternate arts */}
          {cardVariants.length > 0 && (
            <div className="mt-4">
              <h3 className="text-[11px] text-slate-500 dark:text-[#64748b] uppercase tracking-wider font-semibold mb-2">
                Alternate arts
              </h3>
              <div className="space-y-2">
                {cardVariants.map((variant) => (
                  <div key={variant.card.id} className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-slate-500 dark:text-[#64748b] uppercase tracking-wider font-semibold shrink-0">
                      {variant.card.id === card.id ? 'Base' : variant.card.id.replace(card.id, '').replace(/^_/, '') || 'Alt'}
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
                          {img.language === 'english-asia' ? 'EN-AS' : img.language === 'japanese' ? 'JP' : 'EN'}
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
      </div>
    </>
  )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-hidden"
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
      style={overlayStyle}
    >
      {inner}
    </div>
  )
}
