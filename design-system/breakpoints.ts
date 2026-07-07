/**
 * ------------------------------------------------------------
 * Coffee OS Design System
 * Breakpoints
 * ------------------------------------------------------------
 *
 * Responsive breakpoints aligned with Tailwind CSS.
 *
 * Principles
 * ----------
 * • Follow Tailwind defaults
 * • Mobile-first
 * • Single source of truth
 * ------------------------------------------------------------
 */

export const breakpoints = {
    sm: "640px",

    md: "768px",

    lg: "1024px",

    xl: "1280px",

    "2xl": "1536px",
} as const;

export type Breakpoints = typeof breakpoints;