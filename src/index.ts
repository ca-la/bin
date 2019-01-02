const beginTime = Date.now();

/* tslint:disable:no-var-requires */
require('dd-trace').init();

import * as Logger from './services/logger';
import * as Router from 'koa-router';
import { cloneDeep } from 'lodash';

Logger.log('Starting CALA API...');

import * as fs from 'fs';
import * as path from 'path';

/* tslint:disable:no-var-requires */
const attachSession = require('./middleware/attach-session');
const errors = require('./middleware/errors');
const headers = require('./middleware/headers');
const jsonBody = require('./middleware/json-body');
const loggerMiddleware = require('./middleware/logger');
const options = require('./middleware/options');
const { default: validatePagination } = require('./middleware/validate-pagination');

/* application routes */
import componentRelationshipRoutes from './components/component-relationships/routes';

import koa = require('koa');
const app = koa();

app.use(loggerMiddleware);
app.use(errors);
app.use(jsonBody);
app.use(headers);
app.use(options);
app.use(attachSession);
app.use(validatePagination);

const router = new Router({
  prefix: '/:version(v1)?'
});

router.use('/', require('./middleware/root-route'));
router.use('/product-design-collaborators', cloneDeep(require('./routes/collaborators')));
/* tslint:enable:no-var-requires */

const routesDir = path.join(__dirname, 'routes');
const routeDirectories = fs.readdirSync(routesDir);

routeDirectories.forEach((directoryName: string): void => {
  // One of the few legit use cases for dynamic requires. May need to remove
  // this once we add a build system.
  //
  // We use `cloneDeep` to avoid a Koa issue preventing mounting the same routes
  // in mutliple places: https://github.com/alexmingoia/koa-router/issues/244
  router.use(`/${directoryName}`, cloneDeep(require(path.join(routesDir, directoryName))));
});

/* component-based routing */
router.use('/component-relationships', componentRelationshipRoutes);

const loadTime = Date.now() - beginTime;
Logger.log(`Loaded ${routeDirectories.length} route prefixes in ${loadTime}ms`);

app.use(router.routes());

if (!module.parent) {
  const port = process.env.PORT || 8001;
  app.listen(port);

  const bootTime = Date.now() - beginTime;
  Logger.log(`Started and running on :${port} in ${bootTime}ms`);
}

export default app;
