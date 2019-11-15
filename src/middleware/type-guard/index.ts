export function typeGuard<T>(
  guardFn: (data: any) => data is T
): (this: AuthedContext, next: () => Promise<any>) => Iterator<any, any, any> {
  function* middleware(
    this: AuthedContext,
    next: () => Promise<any>
  ): Iterator<any, any, any> {
    const { body } = this.request;

    if (!body || !guardFn(body)) {
      this.throw(400, 'Request does not match type.');
    }

    yield next;
  }

  return middleware;
}
