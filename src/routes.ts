import * as Router from 'koa-router';
import * as fs from 'fs';
import * as path from 'path';
import { cloneDeep } from 'lodash';

/* application routes */
import accessControlRoutes from './components/access-control/routes';
import annotationRoutes from './components/product-design-canvas-annotations/routes';
import annotationCommentRoutes from './components/annotation-comments/routes';
import approvedSignupRoutes from './components/approved-signups/routes';
import bidRoutes from './components/bids/routes';
import canvasRoutes from './components/canvases/routes';
import collaboratorRoutes from './components/collaborators/routes';
import componentRoutes from './components/components/routes';
import commentRoutes from './components/comments/routes';
import componentRelationshipRoutes from './components/component-relationships/routes';
import creditRoutes from './components/credits/routes';
import duplicationRoutes from './components/duplication/routes';
import imageRoutes = require('./components/images/routes');
import notificationRoutes from './components/notifications/routes';
import processRoutes from './components/processes/routes';
import promoCodeRoutes from './components/promo-codes/routes';
import resolveAccountRoutes from './components/resolve-accounts/routes';
import subscriptionRoutes from './components/subscriptions/routes';
import userRoutes from './components/users/routes';

const router = new Router({
  prefix: '/:version(v1)?'
});

/* tslint:disable:no-var-requires */
router.use('/', require('./middleware/root-route'));
router.use('/product-design-collaborators', cloneDeep(collaboratorRoutes));
/* tslint:enable:no-var-requires */

const routesDir = path.join(__dirname, 'routes');
const routeDirectories = fs.readdirSync(routesDir);

routeDirectories.forEach(
  (directoryName: string): void => {
    // One of the few legit use cases for dynamic requires. May need to remove
    // this once we add a build system.
    //
    // We use `cloneDeep` to avoid a Koa issue preventing mounting the same routes
    // in mutliple places: https://github.com/alexmingoia/koa-router/issues/244
    router.use(
      `/${directoryName}`,
      cloneDeep(require(path.join(routesDir, directoryName)))
    );
  }
);

/* component-based routing */
router.use('/access-control', accessControlRoutes);
router.use('/approved-signups', approvedSignupRoutes);
router.use('/bids', bidRoutes);
router.use('/collaborators', collaboratorRoutes);
router.use('/components', componentRoutes);
router.use('/comments', commentRoutes);
router.use('/component-relationships', componentRelationshipRoutes);
router.use('/credits', creditRoutes);
router.use('/duplication', duplicationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/processes', processRoutes);
router.use('/product-design-canvases', canvasRoutes);
router.use('/product-design-canvas-annotations', annotationRoutes);
router.use(
  '/product-design-canvas-annotations/:annotationId/comments',
  annotationCommentRoutes
);
router.use('/product-design-images', imageRoutes);
router.use('/promo-codes', promoCodeRoutes);
router.use('/resolve-accounts', resolveAccountRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/users', userRoutes);

export default router;
