import { NextResponse } from "next/server";

/** Liveness probe for the web container HEALTHCHECK. */
export function GET(): NextResponse {
  return NextResponse.json({ status: "ok" });
}
