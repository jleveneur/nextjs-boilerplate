"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "../lib/cn.ts";

export type FadeProps = HTMLMotionProps<"div"> & {
  children: ReactNode;
};

/** Simple enter fade used by the design-system gallery and light UI transitions. */
export function Fade({ className, children, ...props }: FadeProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn(className)}
      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
