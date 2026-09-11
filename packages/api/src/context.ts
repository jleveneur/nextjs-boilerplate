import { auth, type Session } from "@repo/auth";

/**
 * What every procedure receives.
 *
 * The session is resolved once at the edge — in the route handler or the server
 * caller — and handed to oRPC. Procedures never read cookies themselves.
 */
export type Context = {
  session: Session | null;
};

export async function createContext(headers: Headers): Promise<Context> {
  return { session: await auth.api.getSession({ headers }) };
}
