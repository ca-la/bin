import { ZodSchema } from "zod";
import { check } from "../../services/check";

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

export function typeGuardFromSchema<BodyType>(
  schema: ZodSchema<BodyType>
): (this: AuthedContext, next: any) => Iterator<any, any, any> {
  function* middleware(
    this: AuthedContext,
    next: any
  ): Iterator<any, any, any> {
    const { body } = this.request;

    if (!check(schema, body)) {
      this.throw(400, "Request does not match type.");
    }

    yield next;
  }

  return middleware;
}
