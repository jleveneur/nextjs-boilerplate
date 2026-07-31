"use client";

import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

/**
 * App-level toast host. Mount once in the root layout (or design-system page).
 */
export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster theme="system" className="toaster group" position="bottom-right" {...props} />
  );
}

export { toast } from "sonner";
