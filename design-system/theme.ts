/**
 * ------------------------------------------------------------
 * Coffee OS Design System
 * Theme Contract
 * ------------------------------------------------------------
 *
 * Defines the contract that every Coffee OS theme
 * must implement.
 *
 * This guarantees consistency across all themes.
 * ------------------------------------------------------------
 */

import type { ThemeColors } from "./colors";

/**
 * Theme metadata
 */
export interface ThemeMetadata {
    /**
     * Display name
     */
    name: string;

    /**
     * Short description
     */
    description: string;

    /**
     * Theme version
     */
    version: string;

    /**
     * Theme author
     */
    author: string;

    /**
     * Whether the theme provides a dark mode palette.
     */
    supportsDarkMode: boolean;
}

/**
 * Coffee OS Theme
 */
export interface Theme {
    /**
     * Theme metadata
     */
    metadata: ThemeMetadata;

    /**
     * Semantic color palette
     */
    colors: ThemeColors;
}