declare module "koa-router" {
  import { V1Middleware } from "koa-convert";

  namespace Router {
    export interface RouterOptions {
      /**
       * Prefix for all routes.
       */
      prefix?: string;
    }
  }

  class Router {
    // `stack` is an undocumented array of the registered routes. Not useful
    // except for counting how many routes we have mounted.
    public stack: never[];

    /**
     * Create a new router.
     */
    constructor(opt?: Router.RouterOptions);

    public get(
      path: string | RegExp,
      ...middleware: V1Middleware<any>[]
    ): Router;
    public patch(
      path: string | RegExp,
      ...middleware: V1Middleware<any>[]
    ): Router;
    public post(
      path: string | RegExp,
      ...middleware: V1Middleware<any>[]
    ): Router;
    public put(
      path: string | RegExp,
      ...middleware: V1Middleware<any>[]
    ): Router;
    public del(
      path: string | RegExp,
      ...middleware: V1Middleware<any>[]
    ): Router;
    public use(
      path: string | string[] | RegExp,
      ...middleware: V1Middleware<any>[]
    ): Router;
    /**
     * Returns router middleware which dispatches a route matching the request.
     */
    public routes(): V1Middleware<any>;
  }

  export = Router;
}
