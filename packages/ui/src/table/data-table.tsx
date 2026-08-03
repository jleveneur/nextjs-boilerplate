"use client";

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";

import { Button } from "../components/button.tsx";
import { cn } from "../lib/utils.ts";

export type { ColumnDef };

export type DataTableProps<TData> = {
  columns: ColumnDef<TData>[];
  data: TData[];
  className?: string;
  pageSize?: number;
};

export function DataTable<TData>({
  columns,
  data,
  className,
  pageSize = 10,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  return (
    <div className={cn("flex flex-col gap-3", className)} data-slot="data-table">
      <div className="border-border overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2 text-left font-medium">
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        className={cn(header.column.getCanSort() && "cursor-pointer select-none")}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!table.getCanPreviousPage()}
          onClick={() => {
            table.previousPage();
          }}
        >
          Previous
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!table.getCanNextPage()}
          onClick={() => {
            table.nextPage();
          }}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
