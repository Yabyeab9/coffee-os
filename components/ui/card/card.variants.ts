import { cva } from "class-variance-authority";

export const cardVariants = cva(
  [
    "rounded-xl",
    "border",
    "bg-white",
    "text-stone-900",
    "transition-all",
    "duration-200",
  ],
  {
    variants: {
      elevation: {
        none: "",

        sm: "shadow-sm",

        md: "shadow-md",

        lg: "shadow-lg",
      },

      interactive: {
        true: [
          "cursor-pointer",
          "hover:-translate-y-1",
          "hover:shadow-xl",
        ],

        false: "",
      },
    },

    defaultVariants: {
      elevation: "sm",

      interactive: false,
    },
  }
);