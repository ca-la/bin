const beginTime = Date.now();

import Logger from './services/logger';
Logger.log('Starting CALA API...');

import compress = require('koa-compress');
import koa = require('koa');
import convert = require('koa-convert');

import router from './routes';
import apolloServer from './apollo/server';
import attachSession = require('./middleware/attach-session');
import errors = require('./middleware/errors');
import headers = require('./middleware/headers');
import jsonBody = require('./middleware/json-body');
import loggerMiddleware = require('./middleware/logger');
import options = require('./middleware/options');
import validatePagination from './middleware/validate-pagination';
import shopifyAuth from './middleware/shopify-auth';

const app = new koa();

app.use(compress());
app.use(loggerMiddleware);
app.use(errors);
app.use(jsonBody);
app.use(headers);
app.use(options);
app.use(attachSession);
app.use(validatePagination);
app.use(convert.back(shopifyAuth()));

app.use(router.routes());
app.use(convert.back(apolloServer.getMiddleware({ path: '/v2' })));

const loadTime = Date.now() - beginTime;
Logger.log(`Loaded ${router.stack.length} routes in ${loadTime}ms`);

if (!module.parent) {
  const port = process.env.PORT || 8001;
  app.listen(port);

  const bootTime = Date.now() - beginTime;
  Logger.log(`Started and running on :${port} in ${bootTime}ms`);
}

export default app;
