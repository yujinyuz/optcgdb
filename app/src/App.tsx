import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useAppStore } from './store'
import Layout from './components/Layout'
import CardGrid from './components/CardGrid'
import CardDetail from './components/CardDetail'
import CardModal from './components/CardModal'

// Console easter egg for curious developers
console.log(
  '%c⚓ OPTCG Lib — Offline One Piece TCG Database',
  'color: #c8963e; font-weight: bold; font-size: 14px;',
)
console.log(
  '%cBuilt for players, by players. Find any card in under 5 seconds.',
  'color: #64748b; font-size: 11px;',
)

const loadingMessages = [
  'Loading database...',
  'Preparing card catalog...',
  'Indexing sets and rarities...',
  'Ready to sail...',
]

function OfflineIndicator() {
  const offlineReady = useAppStore((state) => state.offlineReady)
  const showOfflineToast = useAppStore((state) => state.showOfflineToast)
  const dismissOfflineToast = useAppStore((state) => state.dismissOfflineToast)
  const { needRefresh: updateAvailable } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) useAppStore.getState().setOfflineReady(true)
    },
  })

  useEffect(() => {
    if (showOfflineToast) {
      const timer = setTimeout(() => dismissOfflineToast(), 5000)
      return () => clearTimeout(timer)
    }
  }, [showOfflineToast, dismissOfflineToast])

  if (!showOfflineToast) return null

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-white dark:bg-[#1a1d2e] border border-slate-200 dark:border-[#2e303a] rounded-lg px-3 py-2 shadow-lg text-sm animate-[fadeInUp_0.3s_ease-out]">
      <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-slate-600 dark:text-[#94a3b8]">
        {offlineReady ? 'Ready for offline use' : 'Checking offline status...'}
      </span>
      {updateAvailable && (
        <button
          onClick={() => window.location.reload()}
          className="ml-1 text-[#3b82f6] hover:underline font-medium"
        >
          Update
        </button>
      )}
      <button
        onClick={dismissOfflineToast}
        className="ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

function App() {
  const init = useAppStore((state) => state.init)
  const loading = useAppStore((state) => state.loading)
  const error = useAppStore((state) => state.error)
  const selectedCard = useAppStore((state) => state.selectedCard)
  const setSelectedCard = useAppStore((state) => state.setSelectedCard)
  const setOnlineStatus = useAppStore((state) => state.setOnlineStatus)
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true)
    const handleOffline = () => setOnlineStatus(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnlineStatus])

  // Rotate loading messages
  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setLoadingMsgIdx((i) => (i + 1) % loadingMessages.length)
    }, 800)
    return () => clearInterval(interval)
  }, [loading])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0f1117] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-slate-200 dark:border-[#2e303a] border-t-[#3b82f6] rounded-full animate-spin" />
          <div className="text-slate-500 dark:text-[#94a3b8] text-sm font-medium tracking-wide transition-opacity duration-300" key={loadingMsgIdx}>
            {loadingMessages[loadingMsgIdx]}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0f1117] flex items-center justify-center px-4">
        <div className="bg-white dark:bg-[#1a1d2e] border border-slate-200 dark:border-red-900/30 rounded-xl p-6 max-w-md w-full">
          <div className="text-red-500 dark:text-red-400 font-semibold mb-2">Failed to load</div>
          <div className="text-slate-500 dark:text-[#94a3b8] text-sm">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="h-screen bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-[#e2e8f0] flex flex-col overflow-hidden">
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<CardGrid />} />
            <Route path="/c/:id" element={<CardDetail />} />
            <Route path="/card/:id" element={<CardDetail />} />
          </Route>
        </Routes>
        {selectedCard && (
          <CardModal cardId={selectedCard.id} onClose={() => setSelectedCard(null)} />
        )}
        <OfflineIndicator />
      </div>
    </BrowserRouter>
  )
}

export default App
