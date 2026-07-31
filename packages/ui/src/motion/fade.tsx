"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "../lib/cn.ts";

export type FadeProps = HTMLMotionProps<"div"> & {
  children: ReactNode;
};

/** Simple enter fade used by the design-system gallery and light UI transitions. */
export function Fade({ className, children, ...props }: FadeProps) {
  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
