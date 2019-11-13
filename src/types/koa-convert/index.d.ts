import { Application, Middleware } from 'koa';

type KoaMiddleware = (
  context: Application.Context,
  next: () => Promise<any>
) => Generator;

declare function convert(mw: KoaMiddleware): Middleware;

declare namespace convert {
  function compose(mw: KoaMiddleware | KoaMiddleware[]): Middleware;
  function back(mw: Middleware): KoaMiddleware;
}

export = convert;
