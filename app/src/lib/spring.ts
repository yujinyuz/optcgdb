/**
 * Spring physics solver — generates WAAPI keyframes that approximate a damped spring.
 *
 * Uses a mass-spring-damper model:
 *   F = -stiffness * x - damping * v
 *
 * Presets tuned for UI motion (values feel native, not bouncy).
 */

export interface SpringConfig {
  stiffness: number   // spring constant (higher = snappier)
  damping: number     // damping coefficient (higher = less oscillation)
  mass: number        // virtual mass (higher = slower)
}

export const springPresets: Record<string, SpringConfig> = {
  // Quick, tight — for small UI elements (pills, toggles, icons)
  tight: { stiffness: 180, damping: 14, mass: 1 },

  // Default — balanced snap for panels, modals, cards
  default: { stiffness: 120, damping: 12, mass: 1 },

  // Soft — gentle, floaty for large surfaces or background elements
  soft: { stiffness: 80, damping: 10, mass: 1.2 },

  // Snappy — fast with slight overshoot, for navigation transitions
  snappy: { stiffness: 200, damping: 16, mass: 0.8 },
}

/**
 * Simulate a spring from displacement=1 to equilibrium=0.
 * Returns array of { time, value } samples (value goes 1→0).
 */
export function simulateSpring(
  config: SpringConfig,
  durationMs: number,
  samples = 60,
): { time: number; value: number }[] {
  const { stiffness, damping, mass } = config
  const dt = durationMs / 1000 / samples
  const points: { time: number; value: number }[] = []

  let x = 1 // start displaced
  let v = 0 // initial velocity

  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * durationMs
    points.push({ time: t, value: 1 - x }) // invert: 0→1

    const acceleration = (-stiffness * x - damping * v) / mass
    v += acceleration * dt
    x += v * dt
  }

  return points
}

/**
 * Convert spring simulation to a CSS cubic-bezier approximation.
 * Fits the spring curve to a cubic-bezier by sampling and finding best match.
 * Returns a string like 'cubic-bezier(0.2, 1, 0.3, 1)'.
 */
export function springToCubicBezier(config: SpringConfig, durationMs = 400): string {
  const points = simulateSpring(config, durationMs)

  // Find the point where value crosses 0.5 to estimate the curve shape
  let t50 = 0.5
  for (let i = 1; i < points.length; i++) {
    if (points[i].value >= 0.5) {
      t50 = points[i].time / durationMs
      break
    }
  }

  // Estimate overshoot
  const maxVal = Math.max(...points.map((p) => p.value))
  const overshoot = Math.max(0, maxVal - 1)

  // Map to cubic-bezier parameters
  // x1 controls early acceleration, y1 controls initial velocity feel
  // x2 controls late deceleration, y2 controls overshoot
  const x1 = Math.max(0.1, t50 * 0.5)
  const y1 = Math.min(0.9, 0.4 + overshoot * 2)
  const x2 = Math.min(0.9, t50 + 0.2)
  const y2 = Math.min(1.2, 1 + overshoot * 3)

  return `cubic-bezier(${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)})`
}

/**
 * Generate WAAPI keyframes from a spring simulation.
 * Use with element.animate(keyframes, { duration, easing: 'linear' }).
 */
export function springKeyframes(
  config: SpringConfig,
  durationMs: number,
  property = 'transform',
  fromValue = 'translateY(100%)',
  toValue = 'translateY(0)',
): Keyframe[] {
  const points = simulateSpring(config, durationMs, 40)

  return points.map((p) => ({
    [property]: p.value === 0 ? fromValue : p.value === 1 ? toValue : interpolateTransform(fromValue, toValue, p.value),
    offset: p.time / durationMs,
    easing: 'linear',
  }))
}

/**
 * Interpolate between two transform strings at a given progress (0-1).
 * Handles translateY, translateX, scale, and opacity.
 */
function interpolateTransform(from: string, to: string, t: number): string {
  // Extract numeric values from transform functions
  const fromNums = extractNumbers(from)
  const toNums = extractNumbers(to)

  if (fromNums.length === 0 || toNums.length === 0) return to

  let idx = 0
  const result = from.replace(/-?\d+\.?\d*/g, () => {
    const fromVal = fromNums[idx]
    const toVal = toNums[idx] ?? fromVal
    idx++
    return String(fromVal + (toVal - fromVal) * t)
  })

  return result
}

function extractNumbers(str: string): number[] {
  const matches = str.match(/-?\d+\.?\d*/g)
  return matches ? matches.map(Number) : []
}

/**
 * Check if the user prefers reduced motion.
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Animate with spring physics, respecting prefers-reduced-motion.
 * Returns the Animation object (can be cancelled or awaited).
 */
export function springAnimate(
  element: Element,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  config: SpringConfig | string = 'default',
  durationMs = 400,
): Animation | null {
  if (prefersReducedMotion()) {
    // Instant jump to final state
    const finalKeyframe = Array.isArray(keyframes) ? keyframes[keyframes.length - 1] : null
    if (finalKeyframe) {
      element.animate([finalKeyframe], { duration: 1, fill: 'forwards' })
    }
    return null
  }

  const springConfig = typeof config === 'string' ? springPresets[config] ?? springPresets.default : config
  const easing = springToCubicBezier(springConfig, durationMs)

  // Use the spring easing with simplified keyframes (start → end)
  const simplified = Array.isArray(keyframes)
    ? [keyframes[0], keyframes[keyframes.length - 1]]
    : keyframes

  return element.animate(simplified, {
    duration: durationMs,
    easing,
    fill: 'forwards',
  })
}
