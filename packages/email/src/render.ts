import { render } from "@react-email/render";

import type { SendEmailInput } from "./types.ts";

export async function resolveHtml(input: SendEmailInput): Promise<string> {
  if (input.html !== undefined) {
    return input.html;
  }

  if (input.react !== undefined) {
    return render(input.react);
  }

  throw new Error("email send requires react or html content");
}
