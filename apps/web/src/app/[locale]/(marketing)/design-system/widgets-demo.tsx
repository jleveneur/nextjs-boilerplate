"use client";

import { useState } from "react";

import { SimpleAreaChart, SimpleBarChart } from "@repo/ui/chart";
import { RichTextEditor } from "@repo/ui/editor";
import { DataTable, type ColumnDef } from "@repo/ui/table";

const CHART_SAMPLE = [
  { label: "Mon", value: 12 },
  { label: "Tue", value: 18 },
  { label: "Wed", value: 9 },
  { label: "Thu", value: 22 },
  { label: "Fri", value: 15 },
] as const;

type DemoRow = { name: string; status: string; amount: string };

const TABLE_COLUMNS: ColumnDef<DemoRow>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "status", header: "Status" },
  { accessorKey: "amount", header: "Amount" },
];

const TABLE_ROWS: DemoRow[] = [
  { name: "Alpha", status: "Open", amount: "$120.00" },
  { name: "Beta", status: "Paid", amount: "$80.00" },
  { name: "Gamma", status: "Draft", amount: "$40.00" },
];

/** Client-only demos — Recharts/Tiptap use Math.random during render. */
export function WidgetsDemo() {
  const [editorHtml, setEditorHtml] = useState("<p>Edit me.</p>");

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Chart</h2>
        <div className="grid w-full gap-6 md:grid-cols-2">
          <SimpleAreaChart data={CHART_SAMPLE} />
          <SimpleBarChart data={CHART_SAMPLE} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Editor</h2>
        <div className="w-full max-w-xl">
          <RichTextEditor value={editorHtml} onChange={setEditorHtml} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Table</h2>
        <div className="w-full">
          <DataTable columns={TABLE_COLUMNS} data={TABLE_ROWS} pageSize={5} />
        </div>
      </section>
    </div>
  );
}
