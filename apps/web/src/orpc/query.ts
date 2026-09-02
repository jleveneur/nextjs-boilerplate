"use client";

import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import { orpcClient } from "./client.ts";

/** Typed TanStack Query helpers for the private oRPC router. */
export const orpc = createTanstackQueryUtils(orpcClient);
