"use client";

import { useRouter } from "next/navigation";
import { useState, type SubmitEvent } from "react";

import { authClient } from "@repo/auth/client";
import { Button, Input, Label, cn } from "@repo/ui";

type Organization = { id: string; name: string; slug: string; role: string };

/**
 * Switches the active organization, and creates new ones.
 *
 * These go through `authClient` rather than the oRPC router on purpose. Both
 * actions change the session, and Better Auth's own route is the only place
 * that can put the refreshed session cookie on the response — routed through
 * oRPC, the cookie cache would keep serving the previous organization for
 * minutes. The server remembers the choice from a session-update hook.
 *
 * A native `<select>` rather than a design-system component: one control,
 * keyboard- and screen-reader-correct for free, and the platform picker on
 * mobile. Swap it for a shadcn `Select` when the design calls for it.
 */
export function OrganizationSwitcher({
  organizations,
  activeId,
}: {
  organizations: Organization[];
  activeId: string;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Shape shared by every `authClient` call: `{ data }` or `{ error }`. */
  type AuthResult = { error?: { message?: string | undefined } | null | undefined };

  async function run(action: () => Promise<AuthResult>) {
    setPending(true);
    setError(null);

    try {
      const result = await action();

      if (result.error) {
        setError(result.error.message ?? "Something went wrong.");
        return;
      }

      setCreating(false);
      setName("");
      // The dashboard is a Server Component that reads the active
      // organization, so the router cache has to be dropped to see the change.
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(() => authClient.organization.create({ name, slug: toSlug(name) }));
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <Label htmlFor="organization" className="sr-only">
          Organization
        </Label>
        <select
          id="organization"
          value={activeId}
          disabled={pending}
          onChange={(event) => {
            const organizationId = event.target.value;
            void run(() => authClient.organization.setActive({ organizationId }));
          }}
          className={cn(
            "border-input bg-background h-8 rounded-lg border px-2 text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          {organizations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => {
            setCreating((open) => !open);
          }}
        >
          {creating ? "Cancel" : "New"}
        </Button>
      </div>

      {creating ? (
        <form className="flex items-center gap-2" onSubmit={submit}>
          <Input
            aria-label="Organization name"
            placeholder="Organization name"
            required
            maxLength={100}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
          <Button type="submit" size="sm" disabled={pending || toSlug(name) === ""}>
            Create
          </Button>
        </form>
      ) : null}

      {error === null ? null : (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Better Auth requires a slug; derive one so the form asks for a name only. */
function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 60);
}
