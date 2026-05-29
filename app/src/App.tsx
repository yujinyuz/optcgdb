import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useAppStore } from './store'
import Layout from './components/Layout'
import CardGrid from './components/CardGrid'
import CardDetail from './components/CardDetail'
import CardModal from './components/CardModal'
import UpdateBanner from './components/UpdateBanner'

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
  'Almost ready...',
]

function OfflineIndicator({ updateAvailable }: { updateAvailable: boolean }) {
  const showOfflineToast = useAppStore((state) => state.showOfflineToast)
  const dismissOfflineToast = useAppStore((state) => state.dismissOfflineToast)

  useEffect(() => {
    if (showOfflineToast) {
      const timer = setTimeout(() => dismissOfflineToast(), 5000)
      return () => clearTimeout(timer)
    }
  }, [showOfflineToast, dismissOfflineToast])

  if (!showOfflineToast || updateAvailable) return null

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-white dark:bg-[#1a1d2e] border border-slate-200 dark:border-[#2e303a] rounded-lg px-3 py-2 shadow-lg text-sm animate-[fadeInUp_0.3s_ease-out]">
      <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-slate-600 dark:text-[#94a3b8]">
        Ready for offline use
      </span>
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

function SlowConnectionIndicator() {
  const isSlowConnection = useAppStore((state) => state.isSlowConnection)
  const showSlowToast = useAppStore((state) => state.showSlowToast)
  const setSlowConnectionOverride = useAppStore((state) => state.setSlowConnectionOverride)
  const dismissSlowToast = useAppStore((state) => state.dismissSlowToast)

  useEffect(() => {
    if (showSlowToast) {
      const timer = setTimeout(() => dismissSlowToast(), 8000)
      return () => clearTimeout(timer)
    }
  }, [showSlowToast, dismissSlowToast])

  if (!showSlowToast || !isSlowConnection) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-lg px-3 py-2 shadow-lg text-sm animate-[fadeInUp_0.3s_ease-out]">
      <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-amber-700 dark:text-amber-300 text-xs">
        Slow network &mdash; images disabled
      </span>
      <button
        onClick={() => setSlowConnectionOverride(true)}
        className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 whitespace-nowrap"
      >
        Load anyway
      </button>
      <button
        onClick={dismissSlowToast}
        className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-200"
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
  const setSlowConnection = useAppStore((state) => state.setSlowConnection)
  const setOfflineReady = useAppStore((state) => state.setOfflineReady)
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)

  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    if (offlineReady) setOfflineReady(true)
  }, [offlineReady, setOfflineReady])

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

  useEffect(() => {
    const conn = (navigator as any).connection
    if (!conn) return
    const checkSlow = () => {
      const slow = conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g' || conn.downlink < 0.5
      setSlowConnection(slow)
    }
    checkSlow()
    conn.addEventListener('change', checkSlow)
    return () => conn.removeEventListener('change', checkSlow)
  }, [setSlowConnection])

  // Rotate loading messages — cycle through but stop at last one
  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setLoadingMsgIdx((i) => Math.min(i + 1, loadingMessages.length - 1))
    }, 800)
    return () => clearInterval(interval)
  }, [loading])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0f1117] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src="/loading-logo.webp" alt="" className="w-10 opacity-50 dark:invert" />
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
        <UpdateBanner needRefresh={needRefresh} onUpdate={updateServiceWorker} />
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
        <SlowConnectionIndicator />
        <OfflineIndicator updateAvailable={needRefresh} />
      </div>
    </BrowserRouter>
  )
}

export default App
