"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "../lib/utils.ts";

export type ChartPoint = {
  label: string;
  value: number;
};

type ChartShellProps = {
  className?: string;
  children: ReactNode;
};

/** Recharts defaults to a light tooltip box; bind it to theme tokens. */
const chartTooltipContentStyle = {
  backgroundColor: "var(--popover)",
  color: "var(--popover-foreground)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg, 0.5rem)",
  boxShadow: "0 4px 6px -1px color-mix(in oklch, var(--foreground) 10%, transparent)",
  fontSize: "0.75rem",
} satisfies CSSProperties;

const chartTooltipLabelStyle = {
  color: "var(--popover-foreground)",
  fontWeight: 500,
} satisfies CSSProperties;

const chartTooltipItemStyle = {
  color: "var(--muted-foreground)",
} satisfies CSSProperties;

const chartAxisTick = { fill: "var(--muted-foreground)", fontSize: 12 } satisfies CSSProperties;

function ChartTooltip() {
  return (
    <Tooltip
      cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }}
      contentStyle={chartTooltipContentStyle}
      labelStyle={chartTooltipLabelStyle}
      itemStyle={chartTooltipItemStyle}
    />
  );
}

export function ChartContainer({ className, children }: ChartShellProps) {
  return (
    <div className={cn("h-64 w-full min-w-0", className)} data-slot="chart">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function SimpleAreaChart({ data }: { data: readonly ChartPoint[] }) {
  return (
    <ChartContainer>
      <AreaChart data={[...data]}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={chartAxisTick} />
        <YAxis tickLine={false} axisLine={false} width={40} tick={chartAxisTick} />
        <ChartTooltip />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--color-primary, var(--primary))"
          fill="var(--color-primary, var(--primary))"
          fillOpacity={0.15}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function SimpleBarChart({ data }: { data: readonly ChartPoint[] }) {
  return (
    <ChartContainer>
      <BarChart data={[...data]}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={chartAxisTick} />
        <YAxis tickLine={false} axisLine={false} width={40} tick={chartAxisTick} />
        <ChartTooltip />
        <Bar dataKey="value" fill="var(--color-primary, var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
