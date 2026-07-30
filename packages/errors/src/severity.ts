/**
 * Whether an error is an expected domain outcome or a bug.
 *
 * This is the only signal the Sentry integration needs: expected errors are logged
 * and never reported, unexpected ones always are. Alert fatigue is what makes real
 * incidents invisible, so the classification lives on the error rather than being
 * re-derived at the boundary from the class name.
 */
export type ErrorSeverity = "expected" | "unexpected";
