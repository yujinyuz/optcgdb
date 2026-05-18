import { useState, useEffect } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useAppStore } from '../store'
import FilterBar from './FilterBar'

function ThemeToggle() {
  const theme = useAppStore((state) => state.theme)
  const toggleTheme = useAppStore((state) => state.toggleTheme)

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-1.5 rounded-lg text-slate-400 dark:text-[#64748b] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a1d2e] transition-colors"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  )
}

function LanguageToggle() {
  const preferredLanguage = useAppStore((state) => state.preferredLanguage)
  const setPreferredLanguage = useAppStore((state) => state.setPreferredLanguage)

  return (
    <button
      type="button"
      onClick={() => setPreferredLanguage(preferredLanguage === 'english' ? 'japanese' : 'english')}
      className="p-1.5 rounded-lg text-xs font-bold text-slate-400 dark:text-[#64748b] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a1d2e] transition-colors"
      aria-label={`Switch to ${preferredLanguage === 'english' ? 'Japanese' : 'English'}`}
    >
      {preferredLanguage === 'english' ? 'EN' : 'JP'}
    </button>
  )
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const handleClose = () => setSidebarOpen(false)
    window.addEventListener('optcg-close-sidebar', handleClose)
    return () => window.removeEventListener('optcg-close-sidebar', handleClose)
  }, [])

  return (
    <div className="flex-1 flex min-h-screen overflow-hidden">
      {/* Mobile filter toggle */}
      <div className="lg:hidden fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-3 bg-[#3b82f6] text-white rounded-full shadow-lg hover:bg-[#2563eb] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:sticky lg:top-0 left-0 top-0 z-30 h-screen lg:h-screen w-64 bg-slate-50 dark:bg-[#0f1117] border-r border-slate-200 dark:border-[#2e303a] overflow-y-auto transition-transform duration-200 lg:shrink-0`}
      >
        <div className="p-4">
          {/* Header: Title + Theme toggle */}
          <div className="flex items-center justify-between mb-4">
            <Link to="/" className="text-base font-bold tracking-tight text-slate-900 dark:text-white hover:opacity-90 transition-opacity">
              OPTCG DB
            </Link>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1.5 text-slate-500 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <FilterBar />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
