import { ZodSchema } from "zod";

export function check<T>(schema: ZodSchema<T>, data: unknown): data is T {
  const parsed = schema.safeParse(data);
  return parsed.success;
}
