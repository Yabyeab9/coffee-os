/**
 * ------------------------------------------------------------
 * Coffee OS Design System
 * Typography
 * ------------------------------------------------------------
 *
 * Defines all typography tokens used throughout Coffee OS.
 *
 * Principles
 * ----------
 * • Maximum of two font families
 * • Consistent type scale
 * • Semantic font weights
 * • Reusable line heights
 *
 * Components should NEVER hardcode typography values.
 * ------------------------------------------------------------
 */

export const typography = {
    /**
     * Font Families
     */
    fontFamily: {
        heading: "'Playfair Display', serif",

        body: "'Inter', sans-serif",
    },

    /**
     * Font Sizes
     */
    fontSize: {
        xs: "0.75rem", //12
        sm: "0.875rem", //14
        base: "1rem", //16
        lg: "1.125rem", //18
        xl: "1.25rem", //20
        "2xl": "1.5rem", //24
        "3xl": "1.875rem", //30
        "4xl": "2.25rem", //36
        "5xl": "3rem", //48
        "6xl": "3.75rem", //60
    },

    /**
     * Font Weights
     */
    fontWeight: {
        light: 300,

        regular: 400,

        medium: 500,

        semibold: 600,

        bold: 700,
    },

    /**
     * Line Heights
     */
    lineHeight: {
        tight: 1.2,

        normal: 1.5,

        relaxed: 1.75,
    },

    /**
     * Letter Spacing
     */
    letterSpacing: {
        tighter: "-0.03em",

        tight: "-0.02em",

        normal: "0",

        wide: "0.03em",
    },
} as const;

export type Typography = typeof typography;