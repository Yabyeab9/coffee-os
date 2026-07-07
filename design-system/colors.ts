/**
 * ------------------------------------------------------------
 * Coffee OS Design System
 * Color Tokens
 * ------------------------------------------------------------
 *
 * Defines the semantic color contract used by every theme.
 *
 * Components should NEVER use raw hex colors.
 * They should always consume semantic tokens.
 * ------------------------------------------------------------
 */

export interface BrandColors {
    primary: string;

    secondary: string;

    accent: string;
}

export interface BackgroundColors {
    default: string;

    surface: string;

    elevated: string;
}

export interface TextColors {
    primary: string;

    secondary: string;

    inverse: string;
}

export interface BorderColors {
    default: string;

    subtle: string;
}

export interface FeedbackColors {
    success: string;

    warning: string;

    error: string;

    info: string;
}

export interface ThemeColors {
    brand: BrandColors;

    background: BackgroundColors;

    text: TextColors;

    border: BorderColors;

    feedback: FeedbackColors;
}