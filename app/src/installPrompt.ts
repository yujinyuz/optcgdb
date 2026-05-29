type InstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let cachedPrompt: InstallPrompt | null = null
const listeners = new Set<(prompt: InstallPrompt | null) => void>()
let initialized = false

function emit() {
  for (const listener of listeners) listener(cachedPrompt)
}

export function initInstallPromptCapture() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    cachedPrompt = event as InstallPrompt
    emit()
  })

  window.addEventListener('appinstalled', () => {
    cachedPrompt = null
    emit()
  })
}

export function getInstallPrompt() {
  return cachedPrompt
}

export function clearInstallPrompt() {
  cachedPrompt = null
  emit()
}

export function subscribeInstallPrompt(listener: (prompt: InstallPrompt | null) => void) {
  listeners.add(listener)
  listener(cachedPrompt)
  return () => {
    listeners.delete(listener)
  }
}

export type { InstallPrompt }
