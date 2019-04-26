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
    // `stack` is an undocumented array of the registered routes. Not useful
    // except for counting how many routes we have mounted.
    public stack: never[];

    /**
     * Create a new router.
     */
    constructor(opt?: Router.RouterOptions);

    public get(path: string | RegExp, ...middleware: Router.Middleware[]): Router;
    public patch(path: string | RegExp, ...middleware: Router.Middleware[]): Router;
    public post(path: string | RegExp, ...middleware: Router.Middleware[]): Router;
    public put(path: string | RegExp, ...middleware: Router.Middleware[]): Router;
    public del(path: string | RegExp, ...middleware: Router.Middleware[]): Router;
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
