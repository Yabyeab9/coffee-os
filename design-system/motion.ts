/**
 * ------------------------------------------------------------
 * Coffee OS Design System
 * Motion
 * ------------------------------------------------------------
 *
 * Defines animation timing and easing tokens.
 *
 * Principles
 * ----------
 * • Motion should guide attention.
 * • Motion should never distract.
 * • Fast interfaces feel premium.
 * • Consistency over creativity.
 *
 * Components should consume these tokens
 * instead of hardcoding durations.
 * ------------------------------------------------------------
 */

export const motion = {
    duration: {
        instant: 0,

        fast: 150,

        normal: 250,

        slow: 400,

        slower: 600,
    },

    easing: {
        linear: "linear",

        standard: "cubic-bezier(0.4, 0, 0.2, 1)",

        easeIn: "cubic-bezier(0.4, 0, 1, 1)",

        easeOut: "cubic-bezier(0, 0, 0.2, 1)",

        easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    },

    scale: {
        hover: 1.02,

        active: 0.98,
    },
} as const;


export const animations = {
    fadeIn: {},
    slideUp: {},
    slideDown: {},
    scaleIn: {},
};


export type Motion = typeof motion;