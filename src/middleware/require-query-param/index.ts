export function requireQueryParam<T>(param: keyof T): any {
  return function* (this: AuthedContext, next: any): Generator<any, any, any> {
    if (!this.query[param]) {
      this.throw(400, `You must provide ${param} as a query parameter`);
    }

    yield next;
  };
}
