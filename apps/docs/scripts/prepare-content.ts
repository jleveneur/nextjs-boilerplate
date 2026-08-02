/**
 * Sync `docs/{architecture,adr,runbooks}` into Fumadocs content (single source).
 *
 * Writes gitignored MDX under `content/docs/{architecture,adr,runbooks}/` with
 * frontmatter derived from the first H1, plus section `meta.json` page lists.
 * Also copies the committed OpenAPI snapshot for the Scalar page.
 *
 * Hand-written guides (`index`, `getting-started`, `contributing`) live in git
 * under `content/docs/` and are left untouched.
 */

import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, "..");
const repoRoot = resolve(appRoot, "../..");
const contentRoot = join(appRoot, "content/docs");

type SectionId = "architecture" | "adr" | "runbooks";

type Section = {
  id: SectionId;
  sourceDir: string;
  outDir: string;
  title: string;
  description: string;
};

const sections: Section[] = [
  {
    id: "architecture",
    sourceDir: join(repoRoot, "docs/architecture"),
    outDir: join(contentRoot, "architecture"),
    title: "Architecture",
    description: "System design, packages, conventions, and operational shape.",
  },
  {
    id: "adr",
    sourceDir: join(repoRoot, "docs/adr"),
    outDir: join(contentRoot, "adr"),
    title: "ADRs",
    description: "Architecture Decision Records — choices and rejected alternatives.",
  },
  {
    id: "runbooks",
    sourceDir: join(repoRoot, "docs/runbooks"),
    outDir: join(contentRoot, "runbooks"),
    title: "Runbooks",
    description: "Operational procedures for deploy, queues, and incidents.",
  },
];

function slugFromFilename(filename: string): string {
  return basename(filename, ".md");
}

function titleFromMarkdown(markdown: string, fallback: string): string {
  const match = /^#\s+(.+)$/m.exec(markdown);
  if (match?.[1] === undefined) {
    return fallback;
  }
  return match[1].trim();
}

function descriptionFromMarkdown(markdown: string): string {
  const withoutHeading = markdown.replace(/^#\s+.+$/m, "").trim();
  const paragraph = withoutHeading.split(/\n\n+/)[0]?.replace(/\n/g, " ").trim() ?? "";
  const cleaned = paragraph.replace(/[*_`[\]]/g, "");
  if (cleaned.length <= 160) {
    return cleaned;
  }
  return `${cleaned.slice(0, 157).trimEnd()}…`;
}

function rewriteRepoLinks(markdown: string, sectionId: SectionId): string {
  let out = markdown;
  // Cross-folder links used in architecture / ADR prose.
  out = out.replaceAll(
    /\]\(\.\.\/architecture\/([^)]+?)\.md(#[^)]*)?\)/g,
    "](/docs/architecture/$1$2)",
  );
  out = out.replaceAll(/\]\(\.\.\/adr\/([^)]+?)\.md(#[^)]*)?\)/g, "](/docs/adr/$1$2)");
  out = out.replaceAll(/\]\(\.\.\/runbooks\/([^)]+?)\.md(#[^)]*)?\)/g, "](/docs/runbooks/$1$2)");
  // Same-folder relative links.
  out = out.replaceAll(/\]\(\.\/([^)]+?)\.md(#[^)]*)?\)/g, `](/docs/${sectionId}/$1$2)`);
  return out;
}

function syncSection(section: Section): string[] {
  rmSync(section.outDir, { recursive: true, force: true });
  mkdirSync(section.outDir, { recursive: true });

  const files = readdirSync(section.sourceDir)
    .filter((name) => name.endsWith(".md"))
    .toSorted((a, b) => a.localeCompare(b));

  const pages: string[] = [];

  for (const file of files) {
    const slug = slugFromFilename(file);
    const raw = readFileSync(join(section.sourceDir, file), "utf8");
    const title = titleFromMarkdown(raw, slug);
    const description = descriptionFromMarkdown(raw);
    const body = rewriteRepoLinks(raw.replace(/^#\s+.+\n+/, ""), section.id);
    const mdx = `---
title: ${JSON.stringify(title)}
description: ${JSON.stringify(description)}
---

${body}
`;
    writeFileSync(join(section.outDir, `${slug}.mdx`), mdx, "utf8");
    pages.push(slug);
  }

  writeFileSync(
    join(section.outDir, "meta.json"),
    `${JSON.stringify(
      {
        title: section.title,
        description: section.description,
        pages,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return pages;
}

function writeRootMeta(): void {
  writeFileSync(
    join(contentRoot, "meta.json"),
    `${JSON.stringify(
      {
        title: "Documentation",
        pages: [
          "index",
          "getting-started",
          "contributing",
          "---Architecture---",
          "...architecture",
          "---Decisions---",
          "...adr",
          "---Operations---",
          "...runbooks",
        ],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function copyOpenApi(): void {
  const from = join(repoRoot, "apps/api/openapi.json");
  const to = join(appRoot, "public/openapi.json");
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
}

function main(): void {
  mkdirSync(contentRoot, { recursive: true });
  for (const section of sections) {
    const pages = syncSection(section);
    console.log(`✓ ${section.id}: ${String(pages.length)} pages`);
  }
  writeRootMeta();
  copyOpenApi();
  console.log("✓ openapi.json → public/");
  console.log("✓ content/docs ready");
}

main();
