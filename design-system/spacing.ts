/**
 * ------------------------------------------------------------
 * Coffee OS Design System
 * Spacing
 * ------------------------------------------------------------
 *
 * Defines the spacing scale used throughout Coffee OS.
 *
 * Principles
 * ----------
 * • 8-point spacing system
 * • Consistent vertical rhythm
 * • Semantic spacing tokens
 * • No magic numbers
 *
 * Components should NEVER use arbitrary spacing values.
 * ------------------------------------------------------------
 */

export const spacing = {
    /**
     * Base spacing scale
     */
    xs: "0.25rem", // 4px
    sm: "0.5rem", // 8px
    md: "1rem", // 16px
    lg: "1.5rem", // 24px
    xl: "2rem", // 32px
    "2xl": "3rem", // 48px
    "3xl": "4rem", // 64px
    "4xl": "6rem", // 96px
    "5xl": "8rem", // 128px
} as const;

export type Spacing = typeof spacing;