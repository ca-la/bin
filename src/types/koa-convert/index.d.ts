declare module "koa-convert" {
  import Koa from "koa";

  export type V1Middleware<C extends Koa.Context = any> = (
    this: C,
    next: () => V1Middleware<C>
  ) => Iterator<any>;

  export type V2Middleware<C extends Koa.Context = any> = (
    ctx: C,
    next: any
  ) => Promise<any>;

  function convert<C extends Koa.Context>(mw: V1Middleware<C>): V2Middleware<C>;

  namespace convert {
    function compose<C extends Koa.Context>(
      mw: V1Middleware<C> | V1Middleware<C>[]
    ): V1Middleware<C>;
    function back<C extends Koa.Context>(mw: V2Middleware<C>): V1Middleware<C>;
  }

  export default convert;
}
