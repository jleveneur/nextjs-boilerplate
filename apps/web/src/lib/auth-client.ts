"use client";

import { createAppAuthClient } from "@repo/auth/client";

import { env } from "../env/client.ts";

export const authClient = createAppAuthClient({
  baseURL: env.NEXT_PUBLIC_APP_URL,
});
