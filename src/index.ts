const beginTime = Date.now();

import Logger from "./services/logger";
Logger.log("Starting CALA API...");

import compress = require("koa-compress");
import koa = require("koa");
import convert = require("koa-convert");

import { apolloServer } from "./apollo";
import attachSession = require("./middleware/attach-session");
import errors = require("./middleware/errors");
import headers = require("./middleware/headers");
import jsonBody = require("./middleware/json-body");
import loggerMiddleware = require("./middleware/logger");
import metrics from "./middleware/metrics";
import options = require("./middleware/options");
import router from "./routes";
import { registerMessageBuilders } from "./components/cala-components";
import shopifyAuth from "./middleware/shopify-auth";
import validatePagination from "./middleware/validate-pagination";

const app = new koa();

app.use(compress());
app.use(loggerMiddleware);
app.use(metrics);
app.use(errors);
app.use(jsonBody);
app.use(headers);
app.use(options);
app.use(attachSession);
app.use(validatePagination);
app.use(convert.back(shopifyAuth()));

app.use(router.routes());
app.use(convert.back(apolloServer.getMiddleware({ path: "/v2" })));

const loadTime = Date.now() - beginTime;
Logger.log(`Loaded ${router.stack.length} routes in ${loadTime}ms`);

if (!module.parent) {
  registerMessageBuilders();
  const port = process.env.PORT || 8001;
  app.listen(port);

  const bootTime = Date.now() - beginTime;
  Logger.log(`Started and running on :${port} in ${bootTime}ms`);
}

export default app;
