import { forEach } from "lodash";
import Router from "koa-router";
import { V1Middleware } from "koa-convert";
import { CalaRouter, CalaUrlRoutes } from "./types";

export function plugComponentRouter(
  baseRouter: Router,
  calaRouter: CalaRouter
): void {
  const componentRouter = new Router();

  forEach(calaRouter.routes, (routes: CalaUrlRoutes, url: string) => {
    if (!routes || !url) {
      return;
    }
    forEach(
      routes,
      (middleware: V1Middleware[] | undefined, method: string) => {
        if (!middleware) {
          return;
        }
        switch (method) {
          case "get":
            componentRouter.get(url, ...middleware);
            break;
          case "post":
            componentRouter.post(url, ...middleware);
            break;
          case "put":
            componentRouter.put(url, ...middleware);
            break;
          case "patch":
            componentRouter.patch(url, ...middleware);
            break;
          case "del":
            componentRouter.del(url, ...middleware);
            break;
        }
      }
    );
  });

  baseRouter.use(calaRouter.prefix, componentRouter.routes());
}
