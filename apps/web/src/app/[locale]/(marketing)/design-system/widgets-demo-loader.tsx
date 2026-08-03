"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@repo/ui";

const WidgetsDemo = dynamic(
  () => import("./widgets-demo.tsx").then((mod) => ({ default: mod.WidgetsDemo })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full" />,
  },
);

/** Client boundary so chart/editor/table can skip SSR (Math.random in Recharts/Tiptap). */
export function WidgetsDemoLoader() {
  return <WidgetsDemo />;
}
