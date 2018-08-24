declare module 'koa-router' {
  import * as Koa from 'koa';

  namespace Router {
    export interface RouterOptions {
      /**
       * Prefix for all routes.
       */
      prefix?: string;
    }

    type Middleware = (next: () => Promise<any>) => any;
  }

  class Router {
    /**
     * Create a new router.
     */
    constructor(opt?: Router.RouterOptions);

    public post(path: string | RegExp, ...middleware: Router.Middleware[]): Router;
    public get(path: string | RegExp, ...middleware: Router.Middleware[]): Router;
    public use(
      path: string | string[] | RegExp, ...middleware: Router.Middleware[]
    ): Router;
    /**
     * Returns router middleware which dispatches a route matching the request.
     */
    public routes(): Router.Middleware;
  }

  export = Router;
}