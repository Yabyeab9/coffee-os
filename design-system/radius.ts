/**
 * ------------------------------------------------------------
 * Coffee OS Design System
 * Border Radius
 * ------------------------------------------------------------
 *
 * Defines the border radius scale used throughout Coffee OS.
 *
 * Principles
 * ----------
 * • Soft, welcoming corners
 * • Minimal radius options
 * • Consistent visual language
 * • No arbitrary values
 *
 * Components should NEVER hardcode border-radius values.
 * ------------------------------------------------------------
 */

export const radius = {
    none: "0",

    xs: "0.25rem", // 4px

    sm: "0.375rem", // 6px

    md: "0.75rem", // 12px

    lg: "1.25rem", // 20px

    xl: "1.5rem", // 24px

    full: "9999px",
} as const;

export const componentRadius = {
    button: radius.md,
    card: radius.lg,
    input: radius.md,
    badge: radius.full,
    image: radius.lg,
} as const;

export type Radius = typeof radius;