import {
  HTMLAttributes,
  LabelHTMLAttributes,
} from "react";

import { VariantProps } from "class-variance-authority";

import {
  headingVariants,
  textVariants,
} from "./typography.variants";

/**
 * ------------------------------------------------------------
 * Heading
 * ------------------------------------------------------------
 */

export interface HeadingProps
  extends HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {}

/**
 * ------------------------------------------------------------
 * Text
 * ------------------------------------------------------------
 */

export interface TextProps
  extends HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof textVariants> {}

/**
 * ------------------------------------------------------------
 * Label
 * ------------------------------------------------------------
 */

export interface LabelProps
  extends LabelHTMLAttributes<HTMLLabelElement> {}

/**
 * ------------------------------------------------------------
 * Caption
 * ------------------------------------------------------------
 */

export interface CaptionProps
  extends HTMLAttributes<HTMLSpanElement> {}