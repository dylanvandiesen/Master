const Easing = {
  // Linear
  linear: t => t,

  // Quadratic
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  // Cubic
  easeInCubic: t => t * t * t,
  easeOutCubic: t => --t * t * t + 1,
  easeInOutCubic: t =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  // Quartic
  easeInQuart: t => t * t * t * t,
  easeOutQuart: t => 1 - --t * t * t * t,
  easeInOutQuart: t => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t),

  // Quintic
  easeInQuint: t => t * t * t * t * t,
  easeOutQuint: t => 1 + --t * t * t * t * t,
  easeInOutQuint: t =>
    t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t,

  // Sine
  easeInSine: t => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: t => Math.sin((t * Math.PI) / 2),
  easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,

  // Exponential
  easeInExpo: t => (t === 0 ? 0 : Math.pow(1024, t - 1)),
  easeOutExpo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: t => {
    if (t === 0) return 0
    if (t === 1) return 1
    if (t < 0.5) return Math.pow(1024, t * 2 - 1) / 2
    return (2 - Math.pow(2, -20 * t + 10)) / 2
  },

  // Circular
  easeInCirc: t => 1 - Math.sqrt(1 - t * t),
  easeOutCirc: t => Math.sqrt(1 - --t * t),
  easeInOutCirc: t =>
    t < 0.5
      ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
      : (Math.sqrt(1 - (--t * 2 - 1) * t) + 1) / 2,

  // Back
  easeInBack: t => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return c3 * t * t * t - c1 * t * t
  },
  easeOutBack: t => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * --t * t * t + c1 * t * t
  },
  easeInOutBack: t => {
    const c1 = 1.70158
    const c2 = c1 * 1.525
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (2 * t - 2) + c2) + 2) / 2
  },

  // Elastic
  easeInElastic: t => {
    if (t === 0 || t === 1) return t
    return (
      -Math.pow(2, 10 * t - 10) *
      Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3))
    )
  },
  easeOutElastic: t => {
    if (t === 0 || t === 1) return t
    return (
      Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1
    )
  },
  easeInOutElastic: t => {
    if (t === 0 || t === 1) return t
    t *= 2
    if (t < 1) {
      return (
        -0.5 *
        Math.pow(2, 10 * t - 10) *
        Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3))
      )
    }
    return (
      0.5 *
        Math.pow(2, -10 * t + 10) *
        Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3)) +
      1
    )
  },

  // Bounce
  easeOutBounce: t => {
    const n1 = 7.5625
    const d1 = 2.75
    if (t < 1 / d1) {
      return n1 * t * t
    } else if (t < 2 / d1) {
      t -= 1.5 / d1
      return n1 * t * t + 0.75
    } else if (t < 2.5 / d1) {
      t -= 2.25 / d1
      return n1 * t * t + 0.9375
    } else {
      t -= 2.625 / d1
      return n1 * t * t + 0.984375
    }
  },
  easeInBounce: t => 1 - Easing.easeOutBounce(1 - t),
  easeInOutBounce: t =>
    t < 0.5
      ? (1 - Easing.easeOutBounce(1 - 2 * t)) / 2
      : (1 + Easing.easeOutBounce(2 * t - 1)) / 2
}

export default Easing
