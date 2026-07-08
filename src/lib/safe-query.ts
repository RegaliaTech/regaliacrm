/**
 * Runs a database query and, if the database is unreachable (e.g. before the
 * local Postgres is configured), resolves to a fallback value instead of
 * throwing. This keeps the UI viewable during early development.
 */
export async function safeQuery<T>(
  fn: () => Promise<T>,
  fallback: T,
): Promise<{ data: T; ok: boolean }> {
  try {
    const data = await fn();
    return { data, ok: true };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[safeQuery] database unavailable, using fallback:",
        (err as Error).message,
      );
    }
    return { data: fallback, ok: false };
  }
}
