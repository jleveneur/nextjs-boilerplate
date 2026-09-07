/**
 * Scaffolds a layer-correct domain slice.
 *
 * One CRUD resource touches ~17 files here, and that is not ceremony — it is the
 * closed registries (one id union, one permission registry, one schema barrel)
 * that make the architecture coherent. The cost is real either way; the only
 * question is whether you pay it by hand every time and get it slightly wrong.
 *
 * What this writes is deliberately the boring half: the wiring, the registry
 * entries, a tenant-scoped repository, and a service that authorizes before it
 * reads. The interesting half — your columns, your rules — is left as a small
 * marked surface to fill in.
 *
 * Generated code is held to the same bar as written code: `make check` passes
 * immediately after running this, tests included.
 *
 * Every edit is anchored on an exact line, and all anchors are verified *before*
 * anything is written. A generator that half-applies is worse than one that
 * refuses, because the tree then looks scaffolded and is not.
 *
 * Run:  make new-slice NAME=widget [PLURAL=widgets]
 * Test: node --test scripts/new-slice.test.ts
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

export type Names = {
  /** `widget` — variables, file names, the `resource` half of a permission. */
  camel: string;
  /** `Widget` — types and DTOs. */
  pascal: string;
  /** `widgets` — prose and the table's plural sense. */
  plural: string;
};

export function deriveNames(input: string, plural?: string): Names {
  const trimmed = input.trim();
  if (!/^[a-z][a-zA-Z0-9]*$/u.test(trimmed)) {
    throw new Error(
      `Slice name must be lowerCamelCase and singular (got "${input}"). Example: NAME=widget`,
    );
  }

  return {
    camel: trimmed,
    pascal: `${trimmed[0]?.toUpperCase() ?? ""}${trimmed.slice(1)}`,
    plural: plural === undefined || plural.trim() === "" ? `${trimmed}s` : plural.trim(),
  };
}

// ---------------------------------------------------------------------------
// New files
// ---------------------------------------------------------------------------

export function templates(n: Names): Record<string, string> {
  const { camel, pascal, plural } = n;

  return {
    // A slice is its own layer-3 package (ADR-0013), so the scaffold has to
    // emit the package boundary too — manifest, tsconfig, vitest config, the
    // server-only stub, and a barrel — not just the source files.
    [`packages/${camel}/package.json`]: `{
  "name": "@repo/${camel}",
  "version": "0.0.0",
  "private": true,
  "description": "${pascal} slice.",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@repo/authz": "workspace:*",
    "@repo/contracts": "workspace:*",
    "@repo/db": "workspace:*",
    "@repo/errors": "workspace:*",
    "@repo/kernel": "workspace:*",
    "@repo/permissions": "workspace:*",
    "@repo/types": "workspace:*",
    "@repo/utils": "workspace:*",
    "drizzle-orm": "catalog:",
    "server-only": "catalog:"
  },
  "devDependencies": {
    "@repo/logger": "workspace:*",
    "@repo/tsconfig": "workspace:*",
    "@repo/vitest-config": "workspace:*",
    "@types/node": "catalog:",
    "@vitest/coverage-v8": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:"
  },
  "repo": {
    "layer": 3,
    "runtime": "node"
  }
}
`,

    [`packages/${camel}/tsconfig.json`]: `{
  "extends": "@repo/tsconfig/node.json",
  "include": ["src/**/*.ts", "vitest.config.ts"]
}
`,

    [`packages/${camel}/vitest.server-only-stub.ts`]: `/** Stub so Vitest can load modules that import \`server-only\`. */
export const serverOnlyStub = true;
`,

    [`packages/${camel}/vitest.config.ts`]: `import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, mergeConfig } from "vitest/config";

import { defineLibraryConfig } from "@repo/vitest-config";

const root = path.dirname(fileURLToPath(import.meta.url));

const base = defineLibraryConfig({
  name: "@repo/${camel}",
  // Documented floor for this package (docs/architecture/10-testing.md).
  coverage: { lines: 90, functions: 90, branches: 90, statements: 90 },
});

export default mergeConfig(
  base,
  defineConfig({
    resolve: {
      alias: {
        "server-only": path.join(root, "vitest.server-only-stub.ts"),
      },
    },
    test: {
      coverage: {
        exclude: [
          "src/index.ts",
          // A repository is queries with no policy; a mapper is row-to-DTO
          // translation. Both are exercised against real Postgres instead.
          "src/**/*.repository.ts",
          "src/**/*.mapper.ts",
          "src/**/*.test.ts",
          "src/**/*.integration.test.ts",
          "src/**/*.d.ts",
        ],
      },
    },
  }),
);
`,

    [`packages/${camel}/src/index.ts`]: `// oxlint-disable-next-line import/no-unassigned-import
import "server-only";

export {
  create${pascal},
  get${pascal},
  list${pascal}sForOrg,
} from "./${camel}.service.ts";
`,

    [`packages/contracts/src/${camel}.ts`]: `/**
 * ${pascal} wire contracts.
 *
 * camelCase here; snake_case appears only on the public REST surface.
 */

import { z } from "zod";

import { ${camel}IdSchema, organizationIdSchema } from "./ids.ts";
import { paginatedResponseSchema, paginationQuerySchema } from "./pagination.ts";
import { timestampsSchema } from "./timestamp.ts";

export const ${camel}Schema = z
  .object({
    id: ${camel}IdSchema,
    organizationId: organizationIdSchema,
    // TODO(${camel}): replace with your fields.
    name: z.string().min(1).max(200),
  })
  .extend(timestampsSchema.shape);

export type ${pascal} = z.infer<typeof ${camel}Schema>;

export const create${pascal}InputSchema = z.object({
  name: z.string().min(1).max(200),
});

export type Create${pascal}Input = z.infer<typeof create${pascal}InputSchema>;

export const get${pascal}InputSchema = z.object({
  ${camel}Id: ${camel}IdSchema,
});

export type Get${pascal}Input = z.infer<typeof get${pascal}InputSchema>;

export const list${pascal}sInputSchema = paginationQuerySchema;

export type List${pascal}sInput = z.infer<typeof list${pascal}sInputSchema>;

export const list${pascal}sOutputSchema = paginatedResponseSchema(${camel}Schema);

export type List${pascal}sOutput = z.infer<typeof list${pascal}sOutputSchema>;
`,

    [`packages/db/src/schema/${camel}.sql.ts`]: `/**
 * Tenant-scoped ${plural}.
 *
 * Every row carries \`organization_id\`; repositories reach it through
 * \`TenantCtx\`, so a query without a tenant is a type error rather than a leak.
 */

import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { createdAtColumn, deletedAtColumn, idColumn, updatedAtColumn } from "./columns.ts";
import { organization } from "./organization.sql.ts";

export const ${camel} = pgTable(
  "${camel}",
  {
    id: idColumn(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // TODO(${camel}): replace with your columns.
    name: text("name").notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    deletedAt: deletedAtColumn(),
  },
  (table) => [
    // Keyset pagination reads this; without it every list scans the tenant.
    index("idx_${camel}__organization_id_created_at").on(table.organizationId, table.createdAt),
  ],
);
`,

    [`packages/${camel}/src/${camel}.repository.ts`]: `/**
 * ${pascal} persistence — the only ${camel} file that touches \`@repo/db\`.
 *
 * Queries contain no policy. Every one is scoped through \`scopedWhere\`.
 */

import { and, desc, eq, isNull, lt, or, type SQL } from "drizzle-orm";

import { scopedWhere, type TenantCtx } from "@repo/db";
import { ${camel} } from "@repo/db/schema";
import type { ${pascal}Id } from "@repo/types";

export type ${pascal}Row = typeof ${camel}.$inferSelect;

export type Insert${pascal}Input = {
  id: ${pascal}Id;
  name: string;
};

export type List${pascal}sQuery = {
  limit: number;
  cursor?: { createdAt: Date; id: string };
};

export async function insert${pascal}(
  ctx: TenantCtx,
  input: Insert${pascal}Input,
): Promise<${pascal}Row> {
  const [row] = await ctx.db
    .insert(${camel})
    .values({
      id: input.id,
      organizationId: ctx.organizationId,
      name: input.name,
    })
    .returning();

  if (row === undefined) {
    throw new Error("insert${pascal}: insert returned no row");
  }

  return row;
}

export async function find${pascal}ById(
  ctx: TenantCtx,
  id: ${pascal}Id,
): Promise<${pascal}Row | null> {
  const rows = await ctx.db
    .select()
    .from(${camel})
    .where(scopedWhere(ctx, ${camel}, eq(${camel}.id, id), isNull(${camel}.deletedAt)))
    .limit(1);

  return rows[0] ?? null;
}

/** Newest-first keyset page. Fetches \`limit + 1\` to detect a following page. */
export async function list${pascal}s(
  ctx: TenantCtx,
  query: List${pascal}sQuery,
): Promise<${pascal}Row[]> {
  const conditions: SQL[] = [scopedWhere(ctx, ${camel}), isNull(${camel}.deletedAt)];

  if (query.cursor !== undefined) {
    const cursorPredicate = or(
      lt(${camel}.createdAt, query.cursor.createdAt),
      and(eq(${camel}.createdAt, query.cursor.createdAt), lt(${camel}.id, query.cursor.id)),
    );
    if (cursorPredicate !== undefined) {
      conditions.push(cursorPredicate);
    }
  }

  return ctx.db
    .select()
    .from(${camel})
    .where(and(...conditions))
    .orderBy(desc(${camel}.createdAt), desc(${camel}.id))
    .limit(query.limit + 1);
}
`,

    [`packages/${camel}/src/${camel}.mapper.ts`]: `import type { ${pascal} } from "@repo/contracts";
import type { OrganizationId, ${pascal}Id } from "@repo/types";

import type { ${pascal}Row } from "./${camel}.repository.ts";

function brand${pascal}Id(id: string): ${pascal}Id {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- DB/boundary brand
  return id as ${pascal}Id;
}

function brandOrganizationId(id: string): OrganizationId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- DB/boundary brand
  return id as OrganizationId;
}

/** Map a Drizzle ${camel} row to the wire DTO. */
export function to${pascal}Dto(row: ${pascal}Row): ${pascal} {
  return {
    id: brand${pascal}Id(row.id),
    organizationId: brandOrganizationId(row.organizationId),
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(row.deletedAt === null ? {} : { deletedAt: row.deletedAt.toISOString() }),
  };
}
`,

    [`packages/${camel}/src/${camel}.service.ts`]: `/**
 * ${pascal} application services.
 *
 * Authorize → load → decide → persist. Every function takes an explicit actor
 * and scopes its queries by organization; there is no ambient session here.
 */

import { authorize } from "@repo/authz";
import {
  createdAtIdCursorSchema,
  parseCursorPayload,
  type Create${pascal}Input,
  type Get${pascal}Input,
  type List${pascal}sInput,
  type List${pascal}sOutput,
  type ${pascal},
} from "@repo/contracts";
import type { TenantCtx } from "@repo/db";
import { NotFoundError, ValidationError } from "@repo/errors";
import { PERMISSIONS } from "@repo/permissions";
import { encodeCursor } from "@repo/utils";

import type { Ctx } from "@repo/kernel";
import { to${pascal}Dto } from "./${camel}.mapper.ts";
import { find${pascal}ById, insert${pascal}, list${pascal}s } from "./${camel}.repository.ts";

function tenantCtx(ctx: Ctx): TenantCtx {
  return {
    organizationId: ctx.actor.organizationId,
    db: ctx.tx ?? ctx.db,
  };
}

export async function create${pascal}(ctx: Ctx, input: Create${pascal}Input): Promise<${pascal}> {
  authorize(ctx.actor, PERMISSIONS["${camel}:create"], {
    organizationId: ctx.actor.organizationId,
  });

  const row = await insert${pascal}(tenantCtx(ctx), {
    id: ctx.ports.ids.${camel}Id(),
    name: input.name,
  });

  return to${pascal}Dto(row);
}

export async function get${pascal}(ctx: Ctx, input: Get${pascal}Input): Promise<${pascal}> {
  authorize(ctx.actor, PERMISSIONS["${camel}:read"], {
    organizationId: ctx.actor.organizationId,
  });

  const row = await find${pascal}ById(tenantCtx(ctx), input.${camel}Id);
  if (row === null) {
    throw new NotFoundError({ resource: "${camel}", id: input.${camel}Id });
  }

  return to${pascal}Dto(row);
}

export async function list${pascal}sForOrg(
  ctx: Ctx,
  input: List${pascal}sInput,
): Promise<List${pascal}sOutput> {
  authorize(ctx.actor, PERMISSIONS["${camel}:read"], {
    organizationId: ctx.actor.organizationId,
  });

  let cursor: { createdAt: Date; id: string } | undefined;
  if (input.cursor !== undefined) {
    const payload = parseCursorPayload(input.cursor, createdAtIdCursorSchema);
    if (payload === undefined) {
      throw new ValidationError({ message: "Invalid pagination cursor" });
    }

    cursor = { createdAt: new Date(payload.createdAt), id: payload.id };
  }

  const rows = await list${pascal}s(tenantCtx(ctx), {
    limit: input.limit,
    ...(cursor === undefined ? {} : { cursor }),
  });

  const page = rows.slice(0, input.limit);
  const last = page.at(-1);
  const nextCursor =
    rows.length > input.limit && last !== undefined
      ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
      : null;

  return { data: page.map(to${pascal}Dto), nextCursor };
}
`,

    [`packages/${camel}/src/${camel}.service.test.ts`]: `import { Writable } from "node:stream";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, NotFoundError, ValidationError } from "@repo/errors";
import { createLogger } from "@repo/logger";
import { permissionsForRole } from "@repo/permissions";
import type { Actor, OrganizationId, UserId, ${pascal}Id } from "@repo/types";

import type { Ctx } from "@repo/kernel";
import { createTestPorts, type TestPorts } from "@repo/kernel/testing";
import * as repository from "./${camel}.repository.ts";
import { create${pascal}, get${pascal}, list${pascal}sForOrg } from "./${camel}.service.ts";

// The repository is exercised for real in \`*.integration.test.ts\`; here it is a
// seam so the service's own decisions — authorize, map, paginate — are the only
// thing under test.
vi.mock("./${camel}.repository.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof repository>();
  return {
    ...actual,
    insert${pascal}: vi.fn(),
    find${pascal}ById: vi.fn(),
    list${pascal}s: vi.fn(),
  };
});

function brandOrganizationId(id: string): OrganizationId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test brand
  return id as OrganizationId;
}

function brandUserId(id: string): UserId {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test brand
  return id as UserId;
}

function brand${pascal}Id(id: string): ${pascal}Id {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test brand
  return id as ${pascal}Id;
}

const ORGANIZATION_ID = brandOrganizationId("01900000-0000-7000-8000-000000000001");
const ${camel.toUpperCase()}_ID = brand${pascal}Id("01900000-0000-7000-8000-000000000012");

function makeActor(role: "owner" | "member"): Actor {
  return {
    userId: brandUserId("01900000-0000-7000-8000-0000000000aa"),
    organizationId: ORGANIZATION_ID,
    role,
    permissions: permissionsForRole(role),
    isSystem: false,
  };
}

/** An actor holding no grants at all — the deny-by-default case. */
function strangerActor(): Actor {
  return { ...makeActor("member"), permissions: [] };
}

type TestCtx = Omit<Ctx, "ports"> & { ports: TestPorts };

function makeCtx(actor: Actor): TestCtx {
  return {
    actor,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- repository is mocked
    db: {} as Ctx["db"],
    logger: createLogger({
      service: "${camel}-test",
      env: "test",
      level: "error",
      destination: new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      }),
    }),
    ports: createTestPorts(),
  };
}

function row(overrides: Partial<repository.${pascal}Row> = {}): repository.${pascal}Row {
  return {
    id: ${camel.toUpperCase()}_ID,
    organizationId: ORGANIZATION_ID,
    name: "first",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
    ...overrides,
  };
}

describe("create${pascal}", () => {
  beforeEach(() => {
    vi.mocked(repository.insert${pascal}).mockResolvedValue(row());
  });

  it("persists and returns the DTO", async () => {
    const ctx = makeCtx(makeActor("member"));

    await expect(create${pascal}(ctx, { name: "first" })).resolves.toMatchObject({
      id: ${camel.toUpperCase()}_ID,
      organizationId: ORGANIZATION_ID,
      name: "first",
    });
  });

  it("refuses an actor without ${camel}:create", async () => {
    await expect(
      create${pascal}(makeCtx(strangerActor()), { name: "first" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repository.insert${pascal}).not.toHaveBeenCalled();
  });
});

describe("get${pascal}", () => {
  it("returns the DTO when it exists", async () => {
    vi.mocked(repository.find${pascal}ById).mockResolvedValue(row());

    await expect(
      get${pascal}(makeCtx(makeActor("member")), { ${camel}Id: ${camel.toUpperCase()}_ID }),
    ).resolves.toMatchObject({ id: ${camel.toUpperCase()}_ID });
  });

  it("is a NotFound, not an empty result", async () => {
    vi.mocked(repository.find${pascal}ById).mockResolvedValue(null);

    await expect(
      get${pascal}(makeCtx(makeActor("member")), { ${camel}Id: ${camel.toUpperCase()}_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses an actor without ${camel}:read", async () => {
    await expect(
      get${pascal}(makeCtx(strangerActor()), { ${camel}Id: ${camel.toUpperCase()}_ID }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repository.find${pascal}ById).not.toHaveBeenCalled();
  });
});

describe("list${pascal}sForOrg", () => {
  it("returns a page with no cursor when there is nothing more", async () => {
    vi.mocked(repository.list${pascal}s).mockResolvedValue([row()]);

    await expect(
      list${pascal}sForOrg(makeCtx(makeActor("member")), { limit: 20 }),
    ).resolves.toMatchObject({ nextCursor: null });
  });

  it("emits a cursor when the repository returns limit + 1", async () => {
    // The extra row is the lookahead, not a result — it must not be returned.
    vi.mocked(repository.list${pascal}s).mockResolvedValue([
      row({ id: brand${pascal}Id("01900000-0000-7000-8000-00000000001a") }),
      row({ id: brand${pascal}Id("01900000-0000-7000-8000-00000000001b") }),
    ]);

    const page = await list${pascal}sForOrg(makeCtx(makeActor("member")), { limit: 1 });

    expect(page.data).toHaveLength(1);
    expect(page.nextCursor).toBeTypeOf("string");
  });

  it("rejects a malformed cursor instead of ignoring it", async () => {
    await expect(
      list${pascal}sForOrg(makeCtx(makeActor("member")), { limit: 20, cursor: "not-a-cursor" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("refuses an actor without ${camel}:read", async () => {
    await expect(
      list${pascal}sForOrg(makeCtx(strangerActor()), { limit: 20 }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
`,

    [`packages/orpc/src/routers/${camel}.ts`]: `/**
 * ${pascal} transport — thin wrappers over \`@repo/${camel}\` services.
 *
 * Transports translate; they do not decide. No queries here.
 */

import {
  create${pascal}InputSchema,
  get${pascal}InputSchema,
  list${pascal}sInputSchema,
  list${pascal}sOutputSchema,
  ${camel}Schema,
} from "@repo/contracts";
import { create${pascal}, get${pascal}, list${pascal}sForOrg } from "@repo/${camel}";

import { orgProcedure } from "../procedures.ts";

export const ${camel}Router = {
  create: orgProcedure
    .input(create${pascal}InputSchema)
    .output(${camel}Schema)
    .handler(({ context, input }) => create${pascal}(context.serviceCtx, input)),

  get: orgProcedure
    .input(get${pascal}InputSchema)
    .output(${camel}Schema)
    .handler(({ context, input }) => get${pascal}(context.serviceCtx, input)),

  list: orgProcedure
    .input(list${pascal}sInputSchema)
    .output(list${pascal}sOutputSchema)
    .handler(({ context, input }) => list${pascal}sForOrg(context.serviceCtx, input)),
};
`,
  };
}

// ---------------------------------------------------------------------------
// Registry edits
// ---------------------------------------------------------------------------

export type Patch = {
  file: string;
  /** An exact line. Verified before any write; a miss aborts the whole run. */
  anchor: string;
  insert: string;
  /** Place the text before the anchor line instead of after it. */
  before?: boolean;
};

export function patches(n: Names): readonly Patch[] {
  const { camel, pascal } = n;

  return [
    {
      file: "packages/types/src/ids.ts",
      anchor: "/** An audit log entry. */",
      before: true,
      insert: `/** A tenant-scoped ${camel}. */\nexport type ${pascal}Id = Brand<string, "${pascal}Id">;\n`,
    },
    {
      file: "packages/types/src/index.ts",
      anchor: "  UserId,",
      insert: `  ${pascal}Id,`,
    },
    {
      file: "packages/contracts/src/ids.ts",
      anchor: "  OutboxId,",
      insert: `  ${pascal}Id,`,
    },
    {
      file: "packages/contracts/src/ids.ts",
      anchor: "export const invoiceIdSchema = uuidV7Id<InvoiceId>();",
      insert: `export const ${camel}IdSchema = uuidV7Id<${pascal}Id>();`,
    },
    {
      file: "packages/contracts/src/ids.ts",
      anchor: "export function asInvoiceId(id: string): InvoiceId {",
      before: true,
      insert: `/** Validate and brand a UUIDv7 at a trust boundary. */\nexport function as${pascal}Id(id: string): ${pascal}Id {\n  return ${camel}IdSchema.parse(id);\n}\n`,
    },
    {
      file: "packages/contracts/src/index.ts",
      anchor: "  asInvoiceId,",
      insert: `  as${pascal}Id,`,
    },
    {
      file: "packages/contracts/src/index.ts",
      anchor: "  invoiceIdSchema,",
      insert: `  ${camel}IdSchema,`,
    },
    {
      file: "packages/contracts/src/index.ts",
      anchor: '} from "./ids.ts";',
      insert: `export {\n  create${pascal}InputSchema,\n  get${pascal}InputSchema,\n  list${pascal}sInputSchema,\n  list${pascal}sOutputSchema,\n  ${camel}Schema,\n  type Create${pascal}Input,\n  type Get${pascal}Input,\n  type List${pascal}sInput,\n  type List${pascal}sOutput,\n  type ${pascal},\n} from "./${camel}.ts";`,
    },
    {
      file: "packages/permissions/src/registry.ts",
      anchor: '  "asset:read": "asset:read",',
      insert: `  "${camel}:create": "${camel}:create",\n  "${camel}:read": "${camel}:read",\n  "${camel}:update": "${camel}:update",\n  "${camel}:delete": "${camel}:delete",`,
    },
    {
      file: "packages/permissions/src/roles.ts",
      anchor: '  PERMISSIONS["asset:read"],',
      insert: `  PERMISSIONS["${camel}:create"],\n  PERMISSIONS["${camel}:read"],\n  PERMISSIONS["${camel}:update"],`,
    },
    {
      file: "packages/permissions/src/roles.ts",
      anchor: '  PERMISSIONS["billing:manage"],',
      insert: `  PERMISSIONS["${camel}:delete"],`,
    },
    {
      file: "packages/db/src/schema/index.ts",
      anchor: 'export { twoFactor } from "./two-factor.sql.ts";',
      insert: `export { ${camel} } from "./${camel}.sql.ts";`,
    },
    {
      file: "packages/kernel/src/ports/id-generator.ts",
      anchor: "  invoiceId(): InvoiceId;",
      insert: `  ${camel}Id(): ${pascal}Id;`,
    },
    {
      file: "packages/kernel/src/ports/id-generator.ts",
      anchor: "    invoiceId: () => brandInvoiceId(generateUuidV7()),",
      insert: `    ${camel}Id: () => brand${pascal}Id(generateUuidV7()),`,
    },
    {
      file: "packages/kernel/src/testing/uuid-id-generator.ts",
      anchor: "    invoiceId: () => brandInvoiceId(next()),",
      insert: `    ${camel}Id: () => brand${pascal}Id(next()),`,
    },
    {
      // The server-only stub is reachable only through the Vitest alias, so
      // Knip reports it as an unused file until the workspace is declared.
      file: "knip.json",
      anchor: '    "packages/kernel": {',
      before: true,
      insert: `    "packages/${camel}": {\n      "entry": ["vitest.server-only-stub.ts"]\n    },`,
    },
    {
      // Each slice is its own package now, so the transport has to declare the
      // dependency: pnpm's isolated node_modules makes an undeclared import
      // physically unresolvable. Anchored on the first slice entry; the
      // resulting key order is cosmetic, nothing sorts this file.
      file: "packages/orpc/package.json",
      anchor: '    "@repo/assets": "workspace:*",',
      insert: `    "@repo/${camel}": "workspace:*",`,
    },
    {
      file: "packages/orpc/src/root.ts",
      anchor: 'import { billingRouter } from "./routers/billing.ts";',
      insert: `import { ${camel}Router } from "./routers/${camel}.ts";`,
    },
    {
      file: "packages/orpc/src/root.ts",
      anchor: "  assets: assetsRouter,",
      insert: `  ${camel}: ${camel}Router,`,
    },
  ];
}

export function applyPatch(source: string, patch: Patch): string {
  const lines = source.split("\n");
  const index = lines.indexOf(patch.anchor);
  if (index === -1) {
    throw new Error(`${patch.file}: anchor not found — ${JSON.stringify(patch.anchor)}`);
  }

  const at = patch.before === true ? index : index + 1;
  return [...lines.slice(0, at), ...patch.insert.split("\n"), ...lines.slice(at)].join("\n");
}

/** Both id generators need a brand constructor; the shape is identical. */
function brandHelper(pascal: string): string {
  return `function brand${pascal}Id(id: string): ${pascal}Id {\n  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- port brand constructor\n  return id as ${pascal}Id;\n}\n\n`;
}

async function editFile(file: string, edit: (source: string) => string): Promise<void> {
  const path = resolve(ROOT, file);
  await writeFile(path, edit(await readFile(path, "utf8")), "utf8");
}

async function main(): Promise<void> {
  const [rawName, rawPlural] = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
  if (rawName === undefined) {
    console.error("Usage: make new-slice NAME=widget [PLURAL=widgets]");
    process.exitCode = 1;
    return;
  }

  const names = deriveNames(rawName, rawPlural);
  const files = templates(names);
  const planned = patches(names);

  const clashes = Object.keys(files).filter((file) => existsSync(resolve(ROOT, file)));
  if (clashes.length > 0) {
    console.error(`Refusing to overwrite:\n  ${clashes.join("\n  ")}`);
    process.exitCode = 1;
    return;
  }

  const missing: string[] = [];
  for (const patch of planned) {
    const source = await readFile(resolve(ROOT, patch.file), "utf8");
    if (!source.split("\n").includes(patch.anchor)) {
      missing.push(`${patch.file}: ${JSON.stringify(patch.anchor)}`);
    }
  }
  if (missing.length > 0) {
    console.error(
      "Refusing to scaffold — these anchors have moved, so this script's templates\n" +
        "are out of date with the code they are meant to match:\n  " +
        missing.join("\n  "),
    );
    process.exitCode = 1;
    return;
  }

  for (const [file, contents] of Object.entries(files)) {
    const path = resolve(ROOT, file);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, contents, "utf8");
  }

  for (const patch of planned) {
    await editFile(patch.file, (source) => applyPatch(source, patch));
  }

  for (const [file, marker] of [
    [
      "packages/kernel/src/ports/id-generator.ts",
      "/** Create production UUIDv7-backed domain identifiers. */",
    ],
    [
      "packages/kernel/src/testing/uuid-id-generator.ts",
      "/** Deterministic sequence for unit tests. */",
    ],
  ] as const) {
    await editFile(file, (source) =>
      source
        .replace(marker, `${brandHelper(names.pascal)}${marker}`)
        .replace(
          'import type { AssetId, InvoiceId, OrganizationId, OutboxId, UserId } from "@repo/types";',
          `import type {\n  AssetId,\n  InvoiceId,\n  OrganizationId,\n  OutboxId,\n  UserId,\n  ${names.pascal}Id,\n} from "@repo/types";`,
        ),
    );
  }

  console.log(`✓ Scaffolded the ${names.camel} slice.\n`);
  console.log("Created:");
  for (const file of Object.keys(files)) {
    console.log(`  ${file}`);
  }
  console.log("\nRegistered in:");
  for (const file of new Set(planned.map((patch) => patch.file))) {
    console.log(`  ${file}`);
  }
  console.log(`
Next:
  1. Replace the TODO(${names.camel}) fields in the contract and the table.
  2. make db-generate    # a migration for the new table
  3. make authz-matrix   # document the four new permissions
  4. make format && make check
`);
}

if (process.argv[1] === import.meta.filename) {
  await main();
}
