'use strict';

const beginTime = Date.now();

/* eslint-disable-next-line */
const Logger = require('./services/logger');
Logger.log('Starting CALA API...');

const fs = require('fs');
const koa = require('koa');
const path = require('path');
const Router = require('koa-router');
const cloneDeep = require('lodash/cloneDeep');

const attachSession = require('./middleware/attach-session');
const errors = require('./middleware/errors');
const headers = require('./middleware/headers');
const jsonBody = require('./middleware/json-body');
const loggerMiddleware = require('./middleware/logger');
const options = require('./middleware/options');

const app = koa();

app.use(loggerMiddleware);
app.use(errors);
app.use(jsonBody);
app.use(headers);
app.use(options);
app.use(attachSession);

const router = new Router({
  prefix: '/:version(v1)?'
});

router.use('/', require('./middleware/root-route'));

const routesDir = path.join(__dirname, 'routes');
const routeDirectories = fs.readdirSync(routesDir);

routeDirectories.forEach((directoryName) => {
  // One of the few legit use cases for dynamic requires. May need to remove
  // this once we add a build system.
  //
  // We use `cloneDeep` to avoid a Koa issue preventing mounting the same routes
  // in mutliple places: https://github.com/alexmingoia/koa-router/issues/244
  //
  // eslint-disable-next-line global-require,import/no-dynamic-require
  router.use(`/${directoryName}`, cloneDeep(require(path.join(routesDir, directoryName))));
});

const loadTime = Date.now() - beginTime;
Logger.log(`Loaded ${routeDirectories.length} route prefixes in ${loadTime}ms`);

app.use(router.routes());

if (!module.parent) {
  const port = process.env.PORT || 8001;
  app.listen(port);

  const bootTime = Date.now() - beginTime;
  Logger.log(`Started and running on :${port} in ${bootTime}ms`);
}

module.exports = app;
