import { forwardRef } from "react";

import { cn } from "@/lib";

import type {
  CardProps,
  CardSectionProps,
} from "./card.types";

import { cardVariants } from "./card.variants";

const CardRoot = forwardRef<
  HTMLDivElement,
  CardProps
>(
  (
    {
      className,
      elevation,
      interactive,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({
            elevation,
            interactive,
          }),
          className
        )}
        {...props}
      />
    );
  }
);

CardRoot.displayName = "Card";

const Header = forwardRef<
  HTMLDivElement,
  CardSectionProps
>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-2 p-6",
        className
      )}
      {...props}
    />
  )
);

Header.displayName = "Card.Header";

const Content = forwardRef<
  HTMLDivElement,
  CardSectionProps
>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "px-6 pb-6",
        className
      )}
      {...props}
    />
  )
);

Content.displayName = "Card.Content";

const Footer = forwardRef<
  HTMLDivElement,
  CardSectionProps
>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center px-6 pb-6 pt-2",
        className
      )}
      {...props}
    />
  )
);

Footer.displayName = "Card.Footer";

export const Card = Object.assign(
  CardRoot,
  {
    Header,
    Content,
    Footer,
  }
);