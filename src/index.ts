const beginTime = Date.now();

/* tslint:disable:no-var-requires */
require('dd-trace').init();

import * as Logger from './services/logger';
Logger.log('Starting CALA API...');

import compress = require('koa-compress');
import koa = require('koa');

import router from './routes';
const attachSession = require('./middleware/attach-session');
const errors = require('./middleware/errors');
const headers = require('./middleware/headers');
const jsonBody = require('./middleware/json-body');
const loggerMiddleware = require('./middleware/logger');
const options = require('./middleware/options');
const {
  default: validatePagination
} = require('./middleware/validate-pagination');

const app = koa();

app.use(compress());
app.use(loggerMiddleware);
app.use(errors);
app.use(jsonBody);
app.use(headers);
app.use(options);
app.use(attachSession);
app.use(validatePagination);

app.use(router.routes());

const loadTime = Date.now() - beginTime;
Logger.log(`Loaded ${router.stack.length} routes in ${loadTime}ms`);

if (!module.parent) {
  const port = process.env.PORT || 8001;
  app.listen(port);

  const bootTime = Date.now() - beginTime;
  Logger.log(`Started and running on :${port} in ${bootTime}ms`);
}

export default app;
