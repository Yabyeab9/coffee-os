/**
 * ------------------------------------------------------------
 * Coffee OS Design System
 * Shadows
 * ------------------------------------------------------------
 *
 * Defines elevation tokens for Coffee OS.
 *
 * Principles
 * ----------
 * • Soft shadows
 * • Low contrast
 * • Premium appearance
 * • Minimal elevation levels
 *
 * Shadows should communicate depth,
 * never become visual decoration.
 * ------------------------------------------------------------
 */

export const shadows = {
    none: "none",

    xs: "0 1px 2px rgba(15, 23, 42, 0.05)",

    sm: "0 2px 6px rgba(15, 23, 42, 0.08)",

    md: "0 8px 20px rgba(15, 23, 42, 0.10)",

    lg: "0 16px 40px rgba(15, 23, 42, 0.12)",

    xl: "0 24px 60px rgba(15, 23, 42, 0.16)",
} as const;


export const elevation = {
    card: shadows.sm,
    dropdown: shadows.lg,
    modal: shadows.xl,
    navbar: shadows.none,
} as const;


export type Shadows = typeof shadows;