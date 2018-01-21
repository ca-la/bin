'use strict';

const fs = require('fs');
const koa = require('koa');
const path = require('path');
const Router = require('koa-router');

const app = koa();

const errors = require('./middleware/errors');
const jsonBody = require('./middleware/json-body');
const headers = require('./middleware/headers');
const loggerMiddleware = require('./middleware/logger');
const Logger = require('./services/logger');
const options = require('./middleware/options');
const attachSession = require('./middleware/attach-session');

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
  // this if we ever add a build system..
  // eslint-disable-next-line global-require,import/no-dynamic-require
  router.use(`/${directoryName}`, require(path.join(routesDir, directoryName)));
});

Logger.log(`Loaded ${routeDirectories.length} route prefixes`);

app.use(router.routes());

if (!module.parent) {
  const port = process.env.PORT || 8001;
  app.listen(port);
  Logger.log(`Running on :${port}`);
}

module.exports = app;
