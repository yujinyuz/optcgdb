import { useRef, useCallback, useEffect } from 'react'

interface SwipeConfig {
  /** Minimum distance (px) to consider a swipe */
  threshold?: number
  /** Maximum distance (px) before resistance increases */
  maxDistance?: number
  /** Direction to track: 'x' for horizontal, 'y' for vertical, 'both' */
  direction?: 'x' | 'y' | 'both'
  /** Called on swipe commit with velocity (px/ms) and distance */
  onSwipe?: (velocity: number, distance: number, direction: 'left' | 'right' | 'up' | 'down') => void
  /** Called every frame during drag with current offset */
  onDrag?: (offsetX: number, offsetY: number) => void
  /** Called when drag ends without swipe commit (snap back) */
  onRelease?: () => void
  /** Resistance factor for drag (0-1, lower = more resistance) */
  resistance?: number
}

interface SwipeState {
  isDragging: boolean
  offsetX: number
  offsetY: number
  velocity: number
}

/**
 * Swipe gesture hook with momentum tracking and snap thresholds.
 * Works with both touch and mouse events.
 */
export function useSwipe(config: SwipeConfig = {}) {
  const {
    threshold = 80,
    maxDistance = 300,
    direction = 'x',
    onSwipe,
    onDrag,
    onRelease,
    resistance = 0.6,
  } = config

  const stateRef = useRef<SwipeState>({
    isDragging: false,
    offsetX: 0,
    offsetY: 0,
    velocity: 0,
  })

  const startPosRef = useRef({ x: 0, y: 0 })
  const lastPosRef = useRef({ x: 0, y: 0, time: 0 })
  const velocitiesRef = useRef<number[]>([])
  const elementRef = useRef<HTMLElement | null>(null)

  const handleStart = useCallback((clientX: number, clientY: number) => {
    startPosRef.current = { x: clientX, y: clientY }
    lastPosRef.current = { x: clientX, y: clientY, time: Date.now() }
    velocitiesRef.current = []
    stateRef.current = { isDragging: true, offsetX: 0, offsetY: 0, velocity: 0 }
  }, [])

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!stateRef.current.isDragging) return

    const dx = clientX - startPosRef.current.x
    const dy = clientY - startPosRef.current.y

    // Apply resistance for a more physical feel
    const resist = (dist: number) => {
      const abs = Math.abs(dist)
      if (abs <= maxDistance * 0.5) return dist
      const beyond = abs - maxDistance * 0.5
      return Math.sign(dist) * (maxDistance * 0.5 + beyond * resistance)
    }

    const offsetX = direction !== 'y' ? resist(dx) : 0
    const offsetY = direction !== 'x' ? resist(dy) : 0

    // Track velocity
    const now = Date.now()
    const dt = now - lastPosRef.current.time
    if (dt > 0) {
      const instantVelocity = direction === 'y'
        ? (clientY - lastPosRef.current.y) / dt
        : (clientX - lastPosRef.current.x) / dt
      velocitiesRef.current.push(instantVelocity)
      // Keep last 5 samples for smoothing
      if (velocitiesRef.current.length > 5) velocitiesRef.current.shift()
    }

    lastPosRef.current = { x: clientX, y: clientY, time: now }

    stateRef.current.offsetX = offsetX
    stateRef.current.offsetY = offsetY

    onDrag?.(offsetX, offsetY)
  }, [direction, maxDistance, resistance, onDrag])

  const handleEnd = useCallback(() => {
    if (!stateRef.current.isDragging) return
    stateRef.current.isDragging = false

    // Calculate average velocity from recent samples
    const recentVelocities = velocitiesRef.current.slice(-3)
    const avgVelocity = recentVelocities.length > 0
      ? recentVelocities.reduce((a, b) => a + b, 0) / recentVelocities.length
      : 0

    stateRef.current.velocity = avgVelocity

    const { offsetX, offsetY } = stateRef.current

    // Determine if swipe threshold was met
    if (direction === 'x' && Math.abs(offsetX) >= threshold) {
      const dir = offsetX > 0 ? 'right' : 'left'
      onSwipe?.(avgVelocity, Math.abs(offsetX), dir)
    } else if (direction === 'y' && Math.abs(offsetY) >= threshold) {
      const dir = offsetY > 0 ? 'down' : 'up'
      onSwipe?.(avgVelocity, Math.abs(offsetY), dir)
    } else if (direction === 'both') {
      if (Math.abs(offsetX) >= threshold && Math.abs(offsetX) > Math.abs(offsetY)) {
        onSwipe?.(avgVelocity, Math.abs(offsetX), offsetX > 0 ? 'right' : 'left')
      } else if (Math.abs(offsetY) >= threshold) {
        onSwipe?.(avgVelocity, Math.abs(offsetY), offsetY > 0 ? 'down' : 'up')
      } else {
        onRelease?.()
      }
    } else {
      onRelease?.()
    }

    stateRef.current.offsetX = 0
    stateRef.current.offsetY = 0
  }, [threshold, direction, onSwipe, onRelease])

  // Touch handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    handleStart(t.clientX, t.clientY)
  }, [handleStart])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    handleMove(t.clientX, t.clientY)
  }, [handleMove])

  const onTouchEnd = useCallback(() => {
    handleEnd()
  }, [handleEnd])

  // Mouse handlers (for desktop drag testing)
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY)

    const moveHandler = (ev: MouseEvent) => handleMove(ev.clientX, ev.clientY)
    const upHandler = () => {
      handleEnd()
      document.removeEventListener('mousemove', moveHandler)
      document.removeEventListener('mouseup', upHandler)
    }

    document.addEventListener('mousemove', moveHandler)
    document.addEventListener('mouseup', upHandler)
  }, [handleStart, handleMove, handleEnd])

  // Attach touch listeners to element ref for passive: false (prevent scroll)
  useEffect(() => {
    const el = elementRef.current
    if (!el) return

    const preventScroll = (e: TouchEvent) => {
      if (stateRef.current.isDragging) {
        e.preventDefault()
      }
    }

    el.addEventListener('touchmove', preventScroll, { passive: false })
    return () => el.removeEventListener('touchmove', preventScroll)
  }, [])

  return {
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onMouseDown,
    },
    ref: elementRef,
    state: stateRef,
  }
}

/**
 * Apply a spring-based snap-back animation when a drag is released.
 */
export function snapBack(
  element: HTMLElement,
  axis: 'x' | 'y',
  durationMs = 300,
): void {
  const property = axis === 'x' ? 'translateX' : 'translateY'
  const currentTransform = element.style.transform
  const match = currentTransform.match(/translate[XY]\(([-\d.]+)px\)/)
  const startValue = match ? parseFloat(match[1]) : 0

  if (Math.abs(startValue) < 1) return

  element.animate(
    [
      { [property]: `${startValue}px`, offset: 0 },
      { [property]: '0px', offset: 1 },
    ],
    {
      duration: durationMs,
      easing: 'cubic-bezier(0.2, 1, 0.3, 1)',
      fill: 'forwards',
    },
  )
}
