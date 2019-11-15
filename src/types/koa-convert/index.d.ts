declare module 'koa-convert' {
  import Application, { Middleware } from 'koa';

  type KoaMiddleware = (
    context: Application.Context,
    next: () => Promise<any>
  ) => Generator;

  function convert(mw: KoaMiddleware): Middleware;

  namespace convert {
    function compose(mw: KoaMiddleware | KoaMiddleware[]): Middleware;
    function back(mw: Middleware): KoaMiddleware;
  }

  export = convert;
}
