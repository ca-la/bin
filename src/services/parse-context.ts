import { z } from "zod";
import { StrictContext } from "../router-context";

export function parseContext<Context extends StrictContext<unknown>, Output>(
  ctx: Context,
  schema: z.ZodObject<any, any, any, Output, any>
) {
  const result = schema.safeParse(ctx);

  if (!result.success) {
    ctx.throw(400, {
      message: "Request missing required data.",
      issues: result.error.issues,
    });
  }

  return result.data;
}
