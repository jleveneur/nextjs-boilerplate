import type { DeadLetterErrorContext, DeadLetterRecord } from "./types.ts";

type MoveToDeadLetterOptions = {
  record: DeadLetterRecord;
  enqueue: () => Promise<void>;
  onDeadLetter?: (record: DeadLetterRecord) => void | Promise<void>;
  onDeadLetterError?: (context: DeadLetterErrorContext) => void | Promise<void>;
};

async function reportFailure(
  options: MoveToDeadLetterOptions,
  context: DeadLetterErrorContext,
): Promise<void> {
  if (options.onDeadLetterError === undefined) {
    throw context.error;
  }

  await options.onDeadLetterError(context);
}

export async function moveToDeadLetter(options: MoveToDeadLetterOptions): Promise<void> {
  try {
    await options.enqueue();
  } catch (error: unknown) {
    await reportFailure(options, {
      record: options.record,
      stage: "enqueue",
      error,
    });
    return;
  }

  try {
    await options.onDeadLetter?.(options.record);
  } catch (error: unknown) {
    await reportFailure(options, {
      record: options.record,
      stage: "notify",
      error,
    });
  }
}
