"use client";

import type { AppRouter } from "@repo/trpc/router";
import { createTRPCContext } from "@trpc/tanstack-react-query";

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();
