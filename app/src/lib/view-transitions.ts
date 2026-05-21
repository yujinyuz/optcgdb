/**
 * View Transitions API helpers for card tile → modal morph.
 *
 * Uses document.startViewTransition() to animate a card tile expanding
 * into the modal detail view with shared-element transitions.
 */

const TRANSITION_NAME = 'optcg-card-morph'

/**
 * Check if View Transitions API is supported.
 */
export function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' && 'startViewTransition' in document
}

/**
 * Set a view-transition-name on an element.
 */
export function setTransitionName(element: HTMLElement | null, name: string | null) {
  if (!element) return
  if (name) {
    element.style.viewTransitionName = name
  } else {
    element.style.viewTransitionName = ''
  }
}

/**
 * Morph a card tile into the modal.
 *
 * 1. Find the clicked card tile element
 * 2. Set view-transition-name on it
 * 3. Start view transition
 * 4. Open the modal (which sets the same transition name on its content)
 * 5. Clean up transition names after animation
 */
export async function morphCardToModal(
  tileElement: HTMLElement | null,
  openModal: () => void,
): Promise<void> {
  if (!supportsViewTransitions() || !tileElement) {
    // Fallback: just open the modal
    openModal()
    return
  }

  // Set transition name on the tile
  setTransitionName(tileElement, TRANSITION_NAME)

  // Start the transition
  const transition = document.startViewTransition(() => {
    openModal()
  })

  // Clean up after transition
  try {
    await transition.finished
  } catch {
    // Transition was interrupted
  }

  setTransitionName(tileElement, null)
}

/**
 * Get the view-transition-name for the modal content.
 * Use this in the modal component's style.
 */
export function modalTransitionStyle(): React.CSSProperties {
  return { viewTransitionName: TRANSITION_NAME }
}
