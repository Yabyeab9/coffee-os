import { cn } from "@/lib";

import {
  captionVariants,
} from "./typography.variants";

import type {
  CaptionProps,
} from "./typography.types";

export function Caption({
  className,
  children,
  ...props
}: CaptionProps) {
  return (
    <span
      className={cn(
        captionVariants(),
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}