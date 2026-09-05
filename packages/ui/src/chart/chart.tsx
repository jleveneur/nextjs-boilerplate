"use client";

import { lazy, Suspense, type CSSProperties, type ReactNode } from "react";

import { cn } from "../lib/utils.ts";

export type ChartPoint = {
  label: string;
  value: number;
};

type ChartShellProps = {
  className?: string;
  children: ReactNode;
};

type LoadedChartProps = {
  variant: "area" | "bar";
  data: readonly ChartPoint[];
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

const chartTooltipProps = {
  cursor: { stroke: "var(--border)", strokeDasharray: "3 3" },
  contentStyle: chartTooltipContentStyle,
  labelStyle: chartTooltipLabelStyle,
  itemStyle: chartTooltipItemStyle,
} as const;

const chartFallback = <div className="h-64 w-full min-w-0" aria-busy="true" />;

export function ChartContainer({ className, children }: ChartShellProps) {
  return (
    <div className={cn("h-64 w-full min-w-0", className)} data-slot="chart">
      {children}
    </div>
  );
}

const LoadedChart = lazy(async () => {
  const {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
  } = await import("recharts");

  return {
    default({ variant, data }: LoadedChartProps) {
      const series = [...data];
      const plot =
        variant === "area" ? (
          <AreaChart data={series}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={chartAxisTick} />
            <YAxis tickLine={false} axisLine={false} width={40} tick={chartAxisTick} />
            <Tooltip {...chartTooltipProps} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--color-primary, var(--primary))"
              fill="var(--color-primary, var(--primary))"
              fillOpacity={0.15}
            />
          </AreaChart>
        ) : (
          <BarChart data={series}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={chartAxisTick} />
            <YAxis tickLine={false} axisLine={false} width={40} tick={chartAxisTick} />
            <Tooltip {...chartTooltipProps} />
            <Bar
              dataKey="value"
              fill="var(--color-primary, var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );

      return (
        <ChartContainer>
          <ResponsiveContainer width="100%" height="100%">
            {plot}
          </ResponsiveContainer>
        </ChartContainer>
      );
    },
  };
});

export function SimpleAreaChart({ data }: { data: readonly ChartPoint[] }) {
  return (
    <Suspense fallback={chartFallback}>
      <LoadedChart variant="area" data={data} />
    </Suspense>
  );
}

export function SimpleBarChart({ data }: { data: readonly ChartPoint[] }) {
  return (
    <Suspense fallback={chartFallback}>
      <LoadedChart variant="bar" data={data} />
    </Suspense>
  );
}
