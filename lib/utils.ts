/**
 * ------------------------------------------------------------
 * Coffee OS
 * Utility Functions
 * ------------------------------------------------------------
 *
 * Shared utility functions used across the application.
 * ------------------------------------------------------------
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines conditional class names and intelligently
 * merges conflicting Tailwind CSS classes.
 *
 * Example:
 *
 * cn(
 *   "px-4",
 *   active && "bg-primary",
 *   className
 * )
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}