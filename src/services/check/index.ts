import { ZodAnyDef, ZodType } from "zod";

export function check<T>(
  schema: ZodType<T, ZodAnyDef, unknown>,
  data: unknown
): data is T {
  const parsed = schema.safeParse(data);
  return parsed.success;
}
