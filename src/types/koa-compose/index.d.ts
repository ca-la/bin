declare module "koa-compose" {
  import { V1Middleware } from "koa-convert";
  import Koa from "koa";
  export type Middleware<C extends Koa.Context> = V1Middleware<C>;

  namespace compose {
    export type Middleware<C extends Koa.Context> = V1Middleware<C>;
  }

  function compose<C extends Koa.Context = any>(
    mw: V1Middleware<C>[]
  ): V1Middleware<C>;

  export default compose;
}
