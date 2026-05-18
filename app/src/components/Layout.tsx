import { useState, useEffect, useCallback, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import { useAppStore } from '../store'
import FilterBar from './FilterBar'

function SettingsMenu() {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [installTooltip, setInstallTooltip] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => Promise<void> } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const loadExternalImages = useAppStore((state) => state.loadExternalImages)
  const setLoadExternalImages = useAppStore((state) => state.setLoadExternalImages)
  const theme = useAppStore((state) => state.theme)
  const toggleTheme = useAppStore((state) => state.toggleTheme)
  const preferredLanguage = useAppStore((state) => state.preferredLanguage)
  const setPreferredLanguage = useAppStore((state) => state.setPreferredLanguage)

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as Event & { prompt: () => Promise<void> })
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = useCallback(() => {
    if (isIOS || !deferredPrompt) {
      setInstallTooltip(true)
      return
    }
    deferredPrompt.prompt()
    setDeferredPrompt(null)
  }, [isIOS, deferredPrompt])

  useEffect(() => {
    if (!open) setInstallTooltip(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setClosing(true)
        setTimeout(() => { setOpen(false); setClosing(false) }, 120)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('touchstart', handleClick)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('touchstart', handleClick)
    }
  }, [open])

  if (isStandalone) return null

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => {
          if (open) { setClosing(true); setTimeout(() => { setOpen(false); setClosing(false) }, 120) }
          else { setOpen(true); setClosing(false) }
        }}
        className={`p-2 text-slate-500 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a1d2e] rounded-lg transition-all ${open ? 'rotate-45' : 'rotate-0'}`}
        style={{ transition: 'color 150ms, background-color 150ms, transform 200ms var(--ease-out-expo)' }}
        aria-label="Settings"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-[#1a1d2e] border border-slate-200 dark:border-[#2e303a] rounded-xl shadow-lg py-2 z-50 origin-top-right"
          style={closing
            ? { animation: 'menuOut 120ms var(--ease-out-quart) forwards' }
            : { animation: 'menuIn 150ms var(--ease-out-expo) forwards' }
          }
        >
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-slate-700 dark:text-[#cbd5e1]">Language</span>
            <div className="flex rounded-lg border border-slate-200 dark:border-[#2e303a] overflow-hidden">
              <button
                onClick={() => setPreferredLanguage('english')}
                className={`px-2.5 py-1 text-xs font-bold transition-colors ${preferredLanguage === 'english' ? 'bg-[#3b82f6] text-white' : 'text-slate-500 dark:text-[#64748b] hover:bg-slate-100 dark:hover:bg-[#25283a]'}`}
              >
                EN
              </button>
              <button
                onClick={() => setPreferredLanguage('japanese')}
                className={`px-2.5 py-1 text-xs font-bold transition-colors ${preferredLanguage === 'japanese' ? 'bg-[#3b82f6] text-white' : 'text-slate-500 dark:text-[#64748b] hover:bg-slate-100 dark:hover:bg-[#25283a]'}`}
              >
                JP
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-slate-700 dark:text-[#cbd5e1]">Theme</span>
            <div className="flex rounded-lg border border-slate-200 dark:border-[#2e303a] overflow-hidden">
              <button
                onClick={() => { if (theme === 'dark') toggleTheme() }}
                className={`p-1.5 transition-colors ${theme !== 'dark' ? 'bg-[#3b82f6] text-white' : 'text-slate-500 dark:text-[#64748b] hover:bg-slate-100 dark:hover:bg-[#25283a]'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </button>
              <button
                onClick={() => { if (theme !== 'dark') toggleTheme() }}
                className={`p-1.5 transition-colors ${theme === 'dark' ? 'bg-[#3b82f6] text-white' : 'text-slate-500 dark:text-[#64748b] hover:bg-slate-100 dark:hover:bg-[#25283a]'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </button>
            </div>
          </div>
          <div className="border-t border-slate-100 dark:border-[#2e303a] my-1" />
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-slate-700 dark:text-[#cbd5e1]">Card images</span>
            <button
              onClick={() => setLoadExternalImages(!loadExternalImages)}
              className={`relative w-9 h-5 rounded-full transition-colors ${loadExternalImages ? 'bg-[#3b82f6]' : 'bg-slate-200 dark:bg-[#3a3d4a]'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${loadExternalImages ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
          <div className="border-t border-slate-100 dark:border-[#2e303a] my-1" />
          <button
            onClick={handleInstall}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 dark:text-[#cbd5e1] hover:bg-slate-100 dark:hover:bg-[#25283a] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Install app
          </button>
          <div className="border-t border-slate-100 dark:border-[#2e303a] my-1" />
          <a
            href="https://ko-fi.com/yujinyuz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-[#cbd5e1] hover:bg-slate-100 dark:hover:bg-[#25283a] transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"/>
            </svg>
            Support on Ko-fi
          </a>
        </div>
      )}
      {/* Install tooltip */}
      {installTooltip && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
          onClick={() => setInstallTooltip(false)}
        >
          <div
            className="bg-white dark:bg-[#1a1d2e] rounded-2xl shadow-xl p-6 max-w-xs mx-4 mb-8 sm:mb-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Install app</h3>
              <button
                onClick={() => setInstallTooltip(false)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ol className="text-sm text-slate-600 dark:text-[#cbd5e1] space-y-3">
              {isIOS ? (
                <>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#3b82f6] text-white text-xs font-bold flex items-center justify-center">1</span>
                    <span>Tap the <strong>Share</strong> button in Safari</span>
                  </li>
                  <li className="flex items-center justify-center py-2">
                    <svg className="w-8 h-8 text-[#007aff]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#3b82f6] text-white text-xs font-bold flex items-center justify-center">2</span>
                    <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#3b82f6] text-white text-xs font-bold flex items-center justify-center">3</span>
                    <span>Tap <strong>"Add"</strong> to confirm</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#3b82f6] text-white text-xs font-bold flex items-center justify-center">1</span>
                    <span>Tap the <strong>⋮</strong> menu in your browser</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#3b82f6] text-white text-xs font-bold flex items-center justify-center">2</span>
                    <span>Tap <strong>"Add to Home Screen"</strong> or <strong>"Install app"</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#3b82f6] text-white text-xs font-bold flex items-center justify-center">3</span>
                    <span>Tap <strong>"Install"</strong> to confirm</span>
                  </li>
                </>
              )}
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}

function TopSearchBar() {
  const searchInput = useAppStore((state) => state.searchInput)
  const setSearchInput = useAppStore((state) => state.setSearchInput)
  const setFilters = useAppStore((state) => state.setFilters)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback((value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFilters({ search: value })
    }, 150)
  }, [setSearchInput, setFilters])

  return (
    <div className="relative flex-1 min-w-0 max-w-xs">
      <input
        type="text"
        aria-label="Search cards"
        placeholder="Search..."
        value={searchInput}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full bg-transparent border-0 border-b border-slate-300 dark:border-[#3a3d4a] rounded-none pl-2 pr-9 py-2 text-base sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#64748b] focus:outline-none focus:border-slate-900 dark:focus:border-white focus:ring-0 focus-visible:outline-none transition-colors"
      />
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
        {searchInput && (
          <button
            onClick={() => handleChange('')}
            className="p-1 text-slate-400 dark:text-[#64748b] hover:text-slate-900 dark:hover:text-white rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <svg className="w-4 h-4 text-slate-400 dark:text-[#64748b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
  )
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarClosing, setSidebarClosing] = useState(false)

  useEffect(() => {
    const handleClose = () => { setSidebarClosing(true); setTimeout(() => { setSidebarOpen(false); setSidebarClosing(false) }, 200) }
    const handleOpen = () => { setSidebarOpen(true); setSidebarClosing(false) }
    window.addEventListener('optcg-close-sidebar', handleClose)
    window.addEventListener('optcg-open-sidebar', handleOpen)
    return () => {
      window.removeEventListener('optcg-close-sidebar', handleClose)
      window.removeEventListener('optcg-open-sidebar', handleOpen)
    }
  }, [])

  return (
    <div className="flex-1 flex h-screen overflow-hidden">
      {/* Overlay backdrop */}
      {sidebarOpen && (
        <div
          className={`fixed inset-0 z-30 bg-black/40 ${sidebarClosing ? 'animate-[sidebarOverlayOut_200ms_var(--ease-out-quart)_forwards]' : ''}`}
          onClick={() => { setSidebarClosing(true); setTimeout(() => { setSidebarOpen(false); setSidebarClosing(false) }, 200) }}
          style={!sidebarClosing ? { animation: 'sidebarOverlayIn 150ms var(--ease-out-quart) forwards' } : undefined}
        />
      )}

      {/* Filter panel: bottom sheet on mobile, right drawer on desktop */}
      <aside
        className={`fixed z-30 bg-white dark:bg-[#1a1d2e] border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-[#2e303a] overflow-y-auto transition-transform duration-200 shadow-xl inset-x-0 bottom-0 top-1/3 sm:inset-x-auto sm:top-0 sm:right-0 sm:bottom-0 sm:w-80 sm:h-screen rounded-t-2xl sm:rounded-none ${
          sidebarClosing
            ? 'translate-y-full sm:translate-x-full sm:translate-y-0'
            : sidebarOpen
              ? 'translate-y-0 sm:translate-x-0 sm:translate-y-0'
              : 'translate-y-full sm:translate-x-full sm:translate-y-0'
        }`}
      >
        <div className="p-4">
          {/* Mobile drag handle */}
          <div className="flex justify-center mb-3 sm:hidden">
            <div className="w-8 h-1 rounded-full bg-slate-300 dark:bg-[#3a3d4a]" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Filters</span>
            <button
              onClick={() => { setSidebarClosing(true); setTimeout(() => { setSidebarOpen(false); setSidebarClosing(false) }, 200) }}
              className="p-2 text-slate-500 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#25283a] rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <FilterBar />
        </div>
      </aside>

      {/* Main area: fixed navbar + scrollable content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Navbar */}
        <div className="shrink-0 bg-slate-50 dark:bg-[#0f1117] border-b border-slate-200/60 dark:border-[#2e303a]/60 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="shrink-0">
              <img
                src="/logo-op.png"
                alt="ONE PIECE CARD GAME"
                className="h-5 w-auto dark:hidden"
              />
              <img
                src="/logo-op-white.png"
                alt="ONE PIECE CARD GAME"
                className="h-5 w-auto hidden dark:block"
              />
              <div className="text-[5px] font-bold tracking-wider text-slate-400 dark:text-[#64748b] uppercase leading-none mt-0.5 text-center">
                Offline DB
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <TopSearchBar />
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-slate-500 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a1d2e] rounded-lg active:scale-95 transition-all"
                aria-label="Open filters"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M17 7h.01M12 7h.01" />
                </svg>
              </button>
              <SettingsMenu />
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
