import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Conditional class helper — the only place `clsx` and `tailwind-merge` are used.
 *
 * Call sites import `cn` from `@repo/ui`, never the underlying libraries.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
