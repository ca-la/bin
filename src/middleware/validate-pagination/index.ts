import * as Koa from 'koa';

export default function* validatePagination(
  this: Koa.Application.Context,
  next: () => any
): Iterator<any, any, any> {
  if (this.request.method.toLowerCase() !== 'options') {
    if (this.query.offset) {
      this.assert(Number(this.query.offset) >= 0, 400);
    }

    if (this.query.limit) {
      this.assert(Number(this.query.limit) >= 0, 400);
    }
  }

  return yield next;
}
