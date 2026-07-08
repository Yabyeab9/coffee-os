import { cva } from "class-variance-authority";

/**
 * ------------------------------------------------------------
 * Heading Variants
 * ------------------------------------------------------------
 */

export const headingVariants = cva(
  "font-bold tracking-tight text-stone-900",
  {
    variants: {
      level: {
        1: "text-5xl md:text-6xl",
        2: "text-4xl md:text-5xl",
        3: "text-3xl md:text-4xl",
        4: "text-2xl md:text-3xl",
        5: "text-xl md:text-2xl",
        6: "text-lg md:text-xl",
      },
    },

    defaultVariants: {
      level: 2,
    },
  }
);

/**
 * ------------------------------------------------------------
 * Text Variants
 * ------------------------------------------------------------
 */

export const textVariants = cva(
  "leading-7",
  {
    variants: {
      variant: {
        default: "text-stone-700",

        muted: "text-stone-500",

        accent: "text-amber-700",

        destructive: "text-red-600",
      },

      size: {
        sm: "text-sm",

        md: "text-base",

        lg: "text-lg",
      },
    },

    defaultVariants: {
      variant: "default",

      size: "md",
    },
  }
);

/**
 * ------------------------------------------------------------
 * Caption Variants
 * ------------------------------------------------------------
 */

export const captionVariants = cva(
  "text-sm text-stone-500"
);

/**
 * ------------------------------------------------------------
 * Label Variants
 * ------------------------------------------------------------
 */

export const labelVariants = cva(
  "text-sm font-medium text-stone-800"
);