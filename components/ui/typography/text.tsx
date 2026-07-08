import { cn } from "@/lib";

import {
  textVariants,
} from "./typography.variants";

import type {
  TextProps,
} from "./typography.types";

export function Text({
  variant,
  size,
  className,
  children,
  ...props
}: TextProps) {
  return (
    <p
      className={cn(
        textVariants({
          variant,
          size,
        }),
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}