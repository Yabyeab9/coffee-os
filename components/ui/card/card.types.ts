import { HTMLAttributes } from "react";

import { VariantProps } from "class-variance-authority";

import { cardVariants } from "./card.variants";

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export interface CardSectionProps
  extends HTMLAttributes<HTMLDivElement> {}