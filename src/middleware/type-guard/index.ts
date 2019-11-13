import * as Koa from 'koa';

export function typeGuard<T>(
  guardFn: (data: any) => data is T
): (
  this: Koa.Application.Context,
  next: () => Promise<any>
) => Iterator<any, any, any> {
  function* middleware(
    this: Koa.Application.Context,
    next: () => Promise<any>
  ): Iterator<any, any, any> {
    const { body } = this.request;

    if (!body || !guardFn(body)) {
      return this.throw(400, 'Request does not match type.');
    }

    yield next;
  }

  return middleware;
}
