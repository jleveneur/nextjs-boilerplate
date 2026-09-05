import { z } from "zod";

import { booleanString, optionalUrl } from "../coerce.ts";
import { definePreset } from "../merge-presets.ts";

/** OpenTelemetry export. Disabled by default so local dev stays quiet. */
export const otel = definePreset(
  z.object({
    OTEL_ENABLED: booleanString.default(false),
    OTEL_EXPORTER_OTLP_ENDPOINT: optionalUrl,
    OTEL_SERVICE_NAME: z.string().min(1).default("app"),
  }),
  (env) => {
    if (env["OTEL_ENABLED"] === true && env["OTEL_EXPORTER_OTLP_ENDPOINT"] === undefined) {
      return ["OTEL_EXPORTER_OTLP_ENDPOINT: required when OTEL_ENABLED is true"];
    }
    return [];
  },
);
