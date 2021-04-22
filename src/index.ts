const beginTime = Date.now();

import Logger from "./services/logger";
Logger.log("Starting CALA API...");

import compress = require("koa-compress");
import koa = require("koa");
import convert, { V2Middleware } from "koa-convert";

import { apolloServer } from "./apollo";
import attachSession = require("./middleware/attach-session");
import errors from "./middleware/errors";
import headers = require("./middleware/headers");
import jsonBody = require("./middleware/json-body");
import loggerMiddleware = require("./middleware/logger");
import options from "./middleware/options";
import router from "./routes";
import { registerMessageBuilders } from "./components/cala-components";
import shopifyAuth from "./middleware/shopify-auth";
import validatePagination from "./middleware/validate-pagination";
import { track } from "./middleware/tracking";

const app = new koa();

app.use(compress());
app.use(loggerMiddleware);
app.use(track);
app.use(errors);
app.use(jsonBody);
app.use(headers);
app.use(options);
app.use(attachSession);
app.use(validatePagination);
app.use(convert.back(shopifyAuth()));

app.use(router.routes());
app.use(
  convert.back(
    (apolloServer.getMiddleware({ path: "/v2" }) as unknown) as V2Middleware<
      any
    >
  )
);

const loadTime = Date.now() - beginTime;
Logger.log(`Loaded ${router.stack.length} routes in ${loadTime}ms`);

// See https://nodejs.org/docs/latest/api/deprecations.html#deprecations_dep0144_module_parent
const isEntrypoint = require.main === module;

if (isEntrypoint) {
  registerMessageBuilders();
  const port = process.env.PORT || 8001;
  app.listen(port);

  const bootTime = Date.now() - beginTime;
  Logger.log(`Started and running on :${port} in ${bootTime}ms`);
}

export default app;
