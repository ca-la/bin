import { ZodType } from "zod";

/**
 * Schema must be symmetric (same input and output) in order to use this
 * function since it asserts on the unchanged data value rather than the
 * returned value. Consider using safeParse directly instead of using this
 * function due to have transforms actually affect the input.
 */
export function check<T>(schema: ZodType<T>, data: unknown): data is T {
  const parsed = schema.safeParse(data);
  return parsed.success;
}
