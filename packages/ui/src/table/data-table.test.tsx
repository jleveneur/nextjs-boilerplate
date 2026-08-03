import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectAccessible, renderUi } from "../test/render.tsx";
import { DataTable, type ColumnDef } from "./data-table.tsx";

type Row = { name: string };

const columns: ColumnDef<Row>[] = [{ accessorKey: "name", header: "Name" }];

describe("DataTable", () => {
  it("renders rows and passes axe", async () => {
    const { container } = renderUi(
      <DataTable columns={columns} data={[{ name: "Acme" }]} pageSize={5} />,
    );
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(container.querySelector("[data-slot='data-table']")).not.toBeNull();
    await expectAccessible(container);
  });
});
