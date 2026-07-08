import { cn } from "@/lib";

import {
  labelVariants,
} from "./typography.variants";

import type {
  LabelProps,
} from "./typography.types";

export function Label({
  className,
  children,
  ...props
}: LabelProps) {
  return (
    <label
      className={cn(
        labelVariants(),
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}