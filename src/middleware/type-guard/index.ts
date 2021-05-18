import "koa-bodyparser";
import { ParameterizedContext } from "koa";
import convert from "koa-convert";
import { ZodSchema, ZodTypeDef } from "zod";

export function typeGuard<T>(
  guardFn: (data: any) => data is T
): (this: AuthedContext, next: any) => Iterator<any, any, any> {
  function* middleware(
    this: AuthedContext,
    next: any
  ): Iterator<any, any, any> {
    const { body } = this.request;

    if (!body || !guardFn(body)) {
      this.throw(400, "Request does not match type.");
    }

    yield next;
  }

  return middleware;
}

export interface SafeBodyState<T> {
  safeBody: T;
}

export function typeGuardFromSchema<BodyType>(
  schema: ZodSchema<BodyType, ZodTypeDef, any>
): (
  this: ParameterizedContext & SafeBodyContext<BodyType>,
  next: any
) => Iterator<any, any, any> {
  function* middleware(
    this: ParameterizedContext & SafeBodyContext<BodyType>,
    next: any
  ): Iterator<any, any, any> {
    const { body } = this.request;

    const result = schema.safeParse(body);

    if (!result.success) {
      this.throw(400, "Request does not match type.");
    }

    this.state.safeBody = result.data;

    yield next;
  }

  return middleware;
}

export interface SafeQueryState<T> {
  safeQuery: T;
}

export function safeQuery<BodyType>(
  schema: ZodSchema<BodyType, ZodTypeDef, any>
) {
  return convert.back(
    async (
      ctx: ParameterizedContext<SafeQueryState<BodyType>>,
      next: () => Promise<void>
    ) => {
      const { query } = ctx.request;

      const result = schema.safeParse(query);

      if (!result.success) {
        ctx.throw(400, "Query parameters did not match expected type.");
      }

      ctx.state.safeQuery = result.data;

      await next();
    }
  );
}
