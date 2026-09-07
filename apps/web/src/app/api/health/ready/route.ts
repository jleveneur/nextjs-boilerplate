import { NextResponse } from "next/server";

import { pingDatabase } from "@repo/db";

import { getContainer } from "@/server/container.ts";

/**
 * Readiness probe: liveness plus a database round trip.
 *
 * `/api/health` answers "the process is up"; this answers "it can serve".
 * Deploy tooling waits on this one before shifting traffic.
 */
export async function GET(): Promise<NextResponse> {
  try {
    await pingDatabase(getContainer().db);
    return NextResponse.json({ status: "ready" });
  } catch {
    return NextResponse.json({ status: "not_ready" }, { status: 503 });
  }
}
