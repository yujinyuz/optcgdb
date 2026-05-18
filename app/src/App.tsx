import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAppStore } from './store'
import Layout from './components/Layout'
import CardGrid from './components/CardGrid'
import CardDetail from './components/CardDetail'
import CardModal from './components/CardModal'

function App() {
  const init = useAppStore((state) => state.init)
  const loading = useAppStore((state) => state.loading)
  const error = useAppStore((state) => state.error)
  const selectedCard = useAppStore((state) => state.selectedCard)
  const setSelectedCard = useAppStore((state) => state.setSelectedCard)

  useEffect(() => {
    init()
  }, [init])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0f1117] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-slate-200 dark:border-[#2e303a] border-t-[#3b82f6] rounded-full animate-spin" />
          <div className="text-slate-500 dark:text-[#94a3b8] text-sm font-medium tracking-wide">Loading database...</div>
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
      <div className="min-h-screen bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-[#e2e8f0] flex flex-col">
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<CardGrid />} />
            <Route path="/card/:id" element={<CardDetail />} />
          </Route>
        </Routes>
        {selectedCard && (
          <CardModal cardId={selectedCard.id} onClose={() => setSelectedCard(null)} />
        )}
      </div>
    </BrowserRouter>
  )
}

export default App
