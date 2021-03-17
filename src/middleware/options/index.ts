import Koa from "koa";

export default function* options(this: Koa.Context, next: any): Iterator<any> {
  if (this.method !== "OPTIONS") {
    return yield next;
  }

  this.status = 204;
  this.body = null;
  return yield next;
}
