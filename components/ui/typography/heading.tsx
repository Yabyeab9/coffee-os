import { createElement } from "react";

import { cn } from "@/lib";

import {
  headingVariants,
} from "./typography.variants";

import type {
  HeadingProps,
} from "./typography.types";

export function Heading({
  level = 2,
  className,
  children,
  ...props
}: HeadingProps) {
  return createElement(
    `h${level}`,
    {
      className: cn(
        headingVariants({
          level,
        }),
        className
      ),
      ...props,
    },
    children
  );
}