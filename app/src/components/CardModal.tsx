import { useEffect, useState, useCallback, useRef } from 'react'
import { getCardById, getCardPacks, getCardVariants } from '../db'
import { useAppStore } from '../store'
import type { Card } from '../types'
import ImageLoader from './ImageLoader'
import { COLOR_HEX, RARITY_SHORT, CATEGORY_COLORS } from '../types'
import { decodeHtmlEntities, renderCardText, getAttributeIcon, getAttributeColor, getTextColorForBg, costCircleBg, getExternalImageUrl, groupImagesByLanguage } from '../utils'
import { useSwipe, snapBack } from '../lib/gesture'
import { prefersReducedMotion } from '../lib/spring'

interface CardModalProps {
  cardId: string
  onClose: () => void
}

export default function CardModal({ cardId, onClose }: CardModalProps) {
  const [card, setCard] = useState<Card | null>(null)
  const [cardPacks, setCardPacks] = useState<{ packId: string; label: string; rawTitle: string }[]>([])
  const [cardVariants, setCardVariants] = useState<{ card: Card; images: { language: string; imgUrl: string | null }[]; packs: { title: string; language: string }[] }[]>([])
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)
  const [zoomedImg, setZoomedImg] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const cards = useAppStore((state) => state.cards)
  const setSelectedCard = useAppStore((state) => state.setSelectedCard)
  const preferredLanguage = useAppStore((state) => state.preferredLanguage)
  const loadExternalImages = useAppStore((state) => state.loadExternalImages)
  const reducedMotion = prefersReducedMotion()

  const currentIndex = cards.findIndex((c) => c.id === cardId)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < cards.length - 1

  const goPrev = useCallback(() => {
    if (hasPrev) setSelectedCard(cards[currentIndex - 1])
  }, [hasPrev, currentIndex, cards, setSelectedCard])

  const goNext = useCallback(() => {
    if (hasNext) setSelectedCard(cards[currentIndex + 1])
  }, [hasNext, currentIndex, cards, setSelectedCard])

  // Swipe gesture for prev/next navigation
  const swipeOffsetRef = useRef(0)
  const { handlers: swipeHandlers } = useSwipe({
    threshold: 80,
    maxDistance: 200,
    direction: 'x',
    onSwipe: (_velocity, _distance, direction) => {
      if (direction === 'left' && hasNext) goNext()
      else if (direction === 'right' && hasPrev) goPrev()
      else if (modalRef.current) snapBack(modalRef.current, 'x', 250)
      swipeOffsetRef.current = 0
    },
    onDrag: (offsetX) => {
      swipeOffsetRef.current = offsetX
    },
    onRelease: () => {
      if (modalRef.current && Math.abs(swipeOffsetRef.current) > 0) {
        snapBack(modalRef.current, 'x', 250)
      }
      swipeOffsetRef.current = 0
    },
    resistance: 0.5,
  })

  useEffect(() => {
    let cancelled = false

    async function loadCard() {
      try {
        const result = await getCardById(cardId, preferredLanguage)
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
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    loadCard()
    return () => { cancelled = true }
  }, [cardId, preferredLanguage])

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0
    swipeOffsetRef.current = 0
  }, [cardId])

  const handleClose = useCallback(() => {
    setClosing(true)
    setTimeout(onClose, reducedMotion ? 100 : 200)
  }, [onClose, reducedMotion])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (zoomedImg) {
        setZoomedImg(null)
      } else {
        handleClose()
      }
    }
    if (e.key === 'ArrowLeft') goPrev()
    if (e.key === 'ArrowRight') goNext()
  }, [handleClose, goPrev, goNext, zoomedImg])

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
    ? { animation: `modalOverlayOut ${reducedMotion ? 100 : 150}ms var(--ease-out-quart) forwards` }
    : { animation: `modalOverlayIn ${reducedMotion ? 100 : 150}ms var(--ease-out-quart) forwards` }

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

  const categoryColor = CATEGORY_COLORS[card.category]

  const languagePriority: Record<string, number> = preferredLanguage === 'japanese'
    ? { japanese: 0, 'english-asia': 0, english: 1 }
    : { english: 0, 'english-asia': 1, japanese: 2 }

  // Find the current variant's images first
  const currentVariant = cardVariants.find((v) => v.card.id === card.id)
  const currentImages = currentVariant?.images.filter((img): img is { language: string; imgUrl: string } => !!img.imgUrl) ?? []
  const currentBestImage = currentImages
    .sort((a, b) => (languagePriority[a.language] ?? 3) - (languagePriority[b.language] ?? 3))[0]?.imgUrl ?? null

  // Fallback: pick best image from all variants
  const fallbackImage = cardVariants
    .flatMap((v) => v.images)
    .filter((img): img is { language: string; imgUrl: string } => !!img.imgUrl)
    .sort((a, b) => (languagePriority[a.language] ?? 3) - (languagePriority[b.language] ?? 3))[0]?.imgUrl ?? null

  const bestImageUrl = currentBestImage ?? fallbackImage

  inner = (
    <>
      {/* Swipe hint edges — subtle glow on mobile to indicate swipe navigation */}
      {hasPrev && (
        <div className="sm:hidden absolute left-0 top-1/4 bottom-1/4 w-1 bg-gradient-to-r from-slate-400/20 to-transparent rounded-r-full animate-[swipeHint_2s_ease-in-out_1s_3]" />
      )}
      {hasNext && (
        <div className="sm:hidden absolute right-0 top-1/4 bottom-1/4 w-1 bg-gradient-to-l from-slate-400/20 to-transparent rounded-l-full animate-[swipeHint_2s_ease-in-out_1.5s_3]" />
      )}

      {/* Prev arrow */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev() }}
          className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-3 rounded-full bg-white/90 dark:bg-black/60 text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white shadow-lg hover:scale-105 transition-all touch-manipulation"
          style={{ transition: 'transform 200ms var(--ease-spring-snappy), box-shadow 150ms var(--ease-out-quart)' }}
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
          className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-3 rounded-full bg-white/90 dark:bg-black/60 text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white shadow-lg hover:scale-105 transition-all touch-manipulation"
          style={{ transition: 'transform 200ms var(--ease-spring-snappy), box-shadow 150ms var(--ease-out-quart)' }}
          aria-label="Next card"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      <div
        ref={(el) => {
          contentRef.current = el
          modalRef.current = el
        }}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#1a1d2e] shadow-2xl"
        style={{
          animation: closing
            ? `modalContentOutSpring ${reducedMotion ? 100 : 200}ms var(--ease-out-quart) forwards`
            : `modalContentInSpring ${reducedMotion ? 100 : 250}ms var(--ease-spring-default) forwards`,
          viewTransitionName: 'optcg-card-morph',
        }}
        onClick={(e) => e.stopPropagation()}
        {...swipeHandlers}
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
            {/* Top strip: Cost | Power | Attribute (only when no image) */}
            {(!loadExternalImages || !bestImageUrl) && (
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
            )}

            {/* Card image or link */}
            {loadExternalImages && bestImageUrl ? (
              <div className="flex items-center justify-center py-2">
                <div className="relative w-full max-w-xs aspect-[5/7] rounded-lg overflow-hidden bg-slate-100 dark:bg-[#1a1d2e] shadow-md">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img
                      src="/loading-logo.webp"
                      alt=""
                      className="w-20 opacity-30 animate-pulse dark:invert"
                    />
                  </div>
                  <ImageLoader
                    key={bestImageUrl}
                    src={getExternalImageUrl(bestImageUrl)}
                    alt={card.name}
                    className="absolute inset-0 w-full h-full object-contain cursor-zoom-in"
                    onClick={() => setZoomedImg(getExternalImageUrl(bestImageUrl))}
                  />
                </div>
              </div>
            ) : bestImageUrl && (
              <div className="flex items-center justify-center py-4">
                <a
                  href={bestImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:scale-105 transition-all"
                  title="Open card image in new tab"
                >
                  <img src="/loading-logo.webp" alt="" className="w-10 opacity-50 dark:invert" />
                </a>
              </div>
            )}

            {/* Card Effect */}
            {card.effect && (
              <div className="px-3 sm:px-4 pb-3">
                <div className="mt-3 rounded-xl bg-white dark:bg-[#0f1117] p-3 sm:p-4">
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

            {/* Category -> Name -> Type (always shown, like card list) */}
            <div className="px-3 sm:px-4 pb-3">
              <div
                className="text-[10px] font-medium tracking-[0.3em] uppercase text-center"
                style={categoryColor ? { color: categoryColor } : undefined}
              >
                {card.category === 'Don' ? 'DON!!' : card.category}
              </div>

              <h1 className="mt-0.5 text-2xl text-slate-900 dark:text-white text-center leading-snug card-name">
                {decodeHtmlEntities(card.name)}{card.id !== card.base_id && <span className="text-sm font-normal text-slate-400 dark:text-[#64748b]">{card.id.match(/_p\d+$/) ? ' (Parallel)' : card.id.match(/_r\d+$/) ? ' (Reprint)' : ''}</span>}
              </h1>

              {card.types.length > 0 && (
                <div className="mt-0.5 text-sm text-center text-slate-500 dark:text-[#94a3b8] truncate">
                  {card.types.join(' / ')}
                </div>
              )}

              {/* Attributes — text labels below types (no-image mode) */}
              {(!loadExternalImages || !bestImageUrl) && card.attributes.length > 0 && (
                <div className="mt-0.5 text-sm text-center truncate">
                  {card.attributes.map((attr, i) => (
                    <span key={attr} style={{ color: getAttributeColor(attr) }}>
                      {attr}{i < card.attributes.length - 1 && <span className="text-slate-500 dark:text-[#94a3b8]"> / </span>}
                    </span>
                  ))}
                </div>
              )}

            </div>

            {/* Bottom banner */}
            <div className="px-3 sm:px-4 py-3 bg-slate-900 dark:bg-black text-white">
              <div className="flex items-center justify-between text-sm opacity-90">
                <span className="font-mono">{card.id}</span>
                <div className="flex items-center gap-2">
                  {(!loadExternalImages && card.counter !== null) && (
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
              className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] tracking-wider uppercase bg-white dark:bg-[#1a1d2e] border border-slate-200 dark:border-[#2e303a] rounded-md px-2 py-1 text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:border-[#3b82f6] transition-all"
            >
              <img src="/icons/mercard.png" alt="" className="w-4 h-4 rounded-sm shrink-0" />
              Mercard
            </a>
            <a
              href={`https://yuyu-tei.jp/sell/opc/s/search?search_word=${encodeURIComponent(card.base_id)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] tracking-wider uppercase bg-white dark:bg-[#1a1d2e] border border-slate-200 dark:border-[#2e303a] rounded-md px-2 py-1 text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:border-[#3b82f6] transition-all"
            >
              <img src="/icons/yuyutei.png" alt="" className="w-4 h-4 rounded-sm shrink-0" />
              Yuyu-Tei
            </a>
            <a
              href={`https://www.tcgplayer.com/search/one-piece-card-game/product?q=${encodeURIComponent(card.base_id)}&view=grid&productLineName=one-piece-card-game`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] tracking-wider uppercase bg-white dark:bg-[#1a1d2e] border border-slate-200 dark:border-[#2e303a] rounded-md px-2 py-1 text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:border-[#3b82f6] transition-all"
            >
              <img src="/icons/tcgplayer.png" alt="" className="w-4 h-4 rounded-sm shrink-0" />
              TCGPlayer
            </a>
            <a
              href={`https://www.cardrush-op.jp/product-list?keyword=${encodeURIComponent(card.base_id)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] tracking-wider uppercase bg-white dark:bg-[#1a1d2e] border border-slate-200 dark:border-[#2e303a] rounded-md px-2 py-1 text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:border-[#3b82f6] transition-all"
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
              {loadExternalImages ? (
                /* Inline images */
                <div className="space-y-4">
                  {(() => {
                    const { english, japanese } = groupImagesByLanguage(cardVariants, card.id)
                    return (
                      <>
                        {english.length > 0 && (
                          <div>
                            <div className="text-[10px] text-slate-400 dark:text-[#64748b] uppercase tracking-wider font-semibold mb-1.5">English</div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {english.map((img) => (
                                <div key={img.imgUrl} className="flex flex-col items-center gap-1">
                                  <ImageLoader
                                    src={getExternalImageUrl(img.imgUrl)}
                                    alt=""
                                    className={`w-full rounded-lg shadow-md cursor-zoom-in ${img.isCurrentVariant ? 'ring-2 ring-[#3b82f6]' : ''}`}
                                    onClick={() => setZoomedImg(getExternalImageUrl(img.imgUrl))}
                                  />
                                  <span className="text-[10px] text-slate-500 dark:text-[#64748b]">
                                    {img.packName || ''}{img.variantSuffix}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {japanese.length > 0 && (
                          <div>
                            <div className="text-[10px] text-slate-400 dark:text-[#64748b] uppercase tracking-wider font-semibold mb-1.5">Japanese</div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {japanese.map((img) => (
                                <div key={img.imgUrl} className="flex flex-col items-center gap-1">
                                  <ImageLoader
                                    src={getExternalImageUrl(img.imgUrl)}
                                    alt=""
                                    className={`w-full rounded-lg shadow-md cursor-zoom-in ${img.isCurrentVariant ? 'ring-2 ring-[#3b82f6]' : ''}`}
                                    onClick={() => setZoomedImg(getExternalImageUrl(img.imgUrl))}
                                  />
                                  <span className="text-[10px] text-slate-500 dark:text-[#64748b]">
                                    {img.packName || ''}{img.variantSuffix}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              ) : (
                /* External links */
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
                                  {img.packName || 'Alt'}{img.variantSuffix}
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
                                  {img.packName || 'Alt'}{img.variantSuffix}
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
              )}
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

      {/* Full-screen image zoom overlay */}
      {zoomedImg && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center cursor-zoom-out"
          onClick={(e) => { e.stopPropagation(); setZoomedImg(null) }}
        >
          <div className="relative">
            <ImageLoader
              src={zoomedImg}
              alt="Full view"
              className="max-w-[90vw] max-h-[90vh] object-contain"
              onClick={() => setZoomedImg(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
