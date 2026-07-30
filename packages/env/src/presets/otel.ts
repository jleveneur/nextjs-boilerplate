import { z } from "zod";

import { booleanString, optionalUrl } from "../coerce.ts";

/** OpenTelemetry export. Disabled by default so local dev stays quiet. */
export const otel = z.object({
  OTEL_ENABLED: booleanString.default(false),
  OTEL_EXPORTER_OTLP_ENDPOINT: optionalUrl,
  OTEL_SERVICE_NAME: z.string().min(1).default("app"),
});
