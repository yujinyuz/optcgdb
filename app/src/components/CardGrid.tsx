import { useAppStore } from '../store'
import CardCard from './CardCard'
import SkeletonCard from './SkeletonCard'

export default function CardGrid() {
  const cards = useAppStore((state) => state.cards)
  const totalCards = useAppStore((state) => state.totalCards)
  const hasMore = useAppStore((state) => state.hasMore)
  const searching = useAppStore((state) => state.searching)
  const loadMore = useAppStore((state) => state.loadMore)

  return (
    <div className="px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-slate-600 dark:text-[#94a3b8]">
          {searching && cards.length === 0 ? (
            'Searching...'
          ) : (
            <>
              <span className="text-slate-900 dark:text-white font-medium">{cards.length}</span>
              {' '}of{' '}
              <span className="text-slate-900 dark:text-white font-medium">{totalCards}</span> cards
            </>
          )}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {cards.map((card) => (
          <CardCard key={card.id} card={card} />
        ))}
        {searching && Array.from({ length: 12 }, (_, i) => (
          <SkeletonCard key={`skeleton-${i}`} />
        ))}
      </div>

      {cards.length === 0 && !searching && (
        <div className="mt-16 text-center">
          <div className="text-4xl mb-3">🏴‍☠️</div>
          <div className="text-slate-500 dark:text-[#64748b] text-sm">
            No cards found matching your filters.
          </div>
        </div>
      )}

      {hasMore && !searching && (
        <div className="mt-8 flex items-center justify-center">
          <button
            onClick={() => loadMore()}
            className="px-6 py-2.5 bg-white dark:bg-[#1a1d2e] border border-slate-200 dark:border-[#2e303a] rounded-lg text-sm font-medium text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-[#25283a] hover:border-slate-300 dark:hover:border-[#3e4050] transition-all"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  )
}
