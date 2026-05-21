import { useRef, useCallback, useState } from 'react'
import { useAppStore, getLanguageSections } from '../store'
import CardCard from './CardCard'
import SkeletonCard from './SkeletonCard'
import { prefersReducedMotion } from '../lib/spring'
import { useSwipe } from '../lib/gesture'
import type { Card } from '../types'

/** Pull-to-refresh indicator with anchor icon */
function PullToRefresh({ onRefresh }: { onRefresh: () => void }) {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const { handlers, ref } = useSwipe({
    threshold: 80,
    maxDistance: 120,
    direction: 'y',
    onSwipe: (_velocity, _distance, direction) => {
      if (direction === 'down' && pullDistance >= 80) {
        setRefreshing(true)
        onRefresh()
        setTimeout(() => setRefreshing(false), 1000)
      }
    },
    onDrag: (_offsetX, offsetY) => {
      if (offsetY > 0) setPullDistance(Math.min(offsetY, 120))
    },
    onRelease: () => {
      if (pullDistance < 80) setPullDistance(0)
    },
    resistance: 0.3,
  })

  const rotation = Math.min(pullDistance * 2, 360)
  const opacity = Math.min(pullDistance / 80, 1)

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      {...handlers}
      className="sm:hidden fixed top-0 left-0 right-0 z-40 flex justify-center pointer-events-none"
      style={{ transform: `translateY(${Math.max(pullDistance - 60, 0)}px)` }}
    >
      <div
        className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-[#1a1d2e] shadow-lg border border-slate-200 dark:border-[#2e303a]"
        style={{ opacity }}
      >
        {refreshing ? (
          <svg className="w-5 h-5 text-[#3b82f6] animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 text-slate-500 dark:text-[#94a3b8]"
            style={{ transform: `rotate(${rotation}deg)` }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
          </svg>
        )}
      </div>
    </div>
  )
}

/** Individual card tile wrapper — handles View Transition + spring animation */
function CardTile({ card, displayName, index }: {
  card: Card
  displayName?: string
  index: number
  sectionLang?: string
}) {
  const tileRef = useRef<HTMLDivElement>(null)
  const useSpring = !prefersReducedMotion()

  const handleClick = useCallback(() => {
    const el = tileRef.current?.querySelector('[role="button"]') as HTMLElement | null
    if (el && 'startViewTransition' in document) {
      el.style.viewTransitionName = 'optcg-card-morph'
      // Use direct setState — the modal will pick up the transition name
      import('../store').then(({ useAppStore }) => {
        useAppStore.getState().setSelectedCard(card)
      })
      setTimeout(() => { el.style.viewTransitionName = '' }, 500)
    } else {
      import('../store').then(({ useAppStore }) => {
        useAppStore.getState().setSelectedCard(card)
      })
    }
  }, [card])

  return (
    <div
      ref={tileRef}
      style={useSpring
        ? { animation: `cardInSpring 200ms var(--ease-spring-default) ${Math.min(index * 16, 250)}ms both` }
        : undefined}
      onClick={handleClick}
      className="active:scale-[0.97] transition-transform duration-150"
    >
      <CardCard
        card={card}
        displayName={displayName}
        disableClick
      />
    </div>
  )
}

export default function CardGrid() {
  const cards = useAppStore((state) => state.cards)
  const totalCards = useAppStore((state) => state.totalCards)
  const hasMore = useAppStore((state) => state.hasMore)
  const searching = useAppStore((state) => state.searching)
  const filters = useAppStore((state) => state.filters)
  const loadMore = useAppStore((state) => state.loadMore)
  const sections = getLanguageSections()
  const isSearching = !!filters.search

  const renderCardGrid = (sectionCards: typeof cards, sectionLang?: string) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {sectionCards.map((card, i) => {
        const imgUrlKey = sectionLang === 'japanese' ? 'img_url_jp' : 'img_url_en';
        const displayCard = sectionLang
          ? { ...card, img_url: card[imgUrlKey as 'img_url_en' | 'img_url_jp'] || card.img_url }
          : card;
        return (
          <CardTile
            key={`${card.id}${sectionLang ? `-${sectionLang}` : ''}`}
            card={displayCard}
            displayName={sectionLang !== 'english' ? card.name_translated || undefined : undefined}
            index={i}
            sectionLang={sectionLang}
          />
        );
      })}
      {searching && sectionCards.length === 0 && Array.from({ length: 12 }, (_, i) => (
        <SkeletonCard key={`skeleton-${i}`} />
      ))}
    </div>
  )

  const renderCount = (displayCount: number, displayTotal: number) => (
    <span className="text-sm text-slate-600 dark:text-[#94a3b8]">
      {searching && displayCount === 0 ? (
        'Searching...'
      ) : (
        <>
          <span className="text-slate-900 dark:text-white font-medium">{displayCount}</span>
          {' '}of{' '}
          <span className="text-slate-900 dark:text-white font-medium">{displayTotal}</span> cards
        </>
      )}
    </span>
  )

  return (
    <div className="px-4 sm:px-6 py-6">
      <PullToRefresh onRefresh={() => useAppStore.getState().init()} />

      <div className="flex items-center justify-between mb-3">
        {isSearching && sections.length > 0 ? (
          <span className="text-sm text-slate-600 dark:text-[#94a3b8]">
            {searching && cards.length === 0 ? (
              'Searching...'
            ) : (
              <>
                <span className="text-slate-900 dark:text-white font-medium">{cards.length}</span>
                {' '}of{' '}
                <span className="text-slate-900 dark:text-white font-medium">{totalCards}</span> cards
                {' '}across{' '}
                <span className="text-slate-900 dark:text-white font-medium">{sections.length}</span> language{sections.length > 1 ? 's' : ''}
              </>
            )}
          </span>
        ) : (
          renderCount(cards.length, totalCards)
        )}
      </div>

      {isSearching && sections.length > 0 ? (
        sections.map((section) => (
          <div key={section.lang} className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
              {section.title}
              <span className="ml-2 text-sm font-normal text-slate-500 dark:text-[#64748b]">
                ({section.cards.length})
              </span>
            </h2>
            {renderCardGrid(section.cards, section.lang)}
          </div>
        ))
      ) : (
        renderCardGrid(cards)
      )}

      {cards.length === 0 && !searching && (
        <div className="mt-16 text-center">
          <div className="text-slate-500 dark:text-[#64748b] text-sm font-medium">
            No cards match those filters.
          </div>
          <div className="text-slate-400 dark:text-[#4a5568] text-xs mt-1">
            Try broadening your search or{' '}
            <button
              onClick={() => useAppStore.getState().resetFilters()}
              className="text-[#3b82f6] hover:underline font-medium"
            >
              clear all filters
            </button>
            .
          </div>
        </div>
      )}

      {hasMore && (
        <div className="mt-8 flex items-center justify-center">
          <button
            onClick={() => loadMore()}
            disabled={searching}
            className={`px-6 py-2.5 bg-white dark:bg-[#1a1d2e] border border-slate-200 dark:border-[#2e303a] rounded-lg text-sm font-medium text-slate-900 dark:text-white transition-all active:scale-[0.97] ${searching
              ? 'opacity-50 cursor-not-allowed pointer-events-none'
              : 'hover:bg-slate-100 dark:hover:bg-[#25283a] hover:border-slate-300 dark:hover:border-[#3e4050] hover:-translate-y-0.5 hover:shadow-md'
              }`}
            style={{ transition: 'box-shadow 150ms var(--ease-out-quart), transform 150ms var(--ease-out-quart), opacity 150ms, background-color 150ms, border-color 150ms' }}
          >
            {searching ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
