import * as Router from 'koa-router';
import * as fs from 'fs';
import * as path from 'path';
import { cloneDeep } from 'lodash';

/* application routes */
import accessControlRoutes from './components/access-control/routes';
import annotationCommentRoutes from './components/annotation-comments/routes';
import annotationRoutes from './components/product-design-canvas-annotations/routes';
import assetRoutes from './components/assets/routes';
import bidRoutes from './components/bids/routes';
import bidTaskTypeRoutes from './components/bid-task-types/routes';
import canvasRoutes from './components/canvases/routes';
import collaboratorRoutes from './components/collaborators/routes';
import collectionRoutes from './components/collections/routes';
import commentRoutes from './components/comments/routes';
import componentRelationshipRoutes from './components/component-relationships/routes';
import componentRoutes from './components/components/routes';
import creditRoutes from './components/credits/routes';
import duplicationRoutes from './components/duplication/routes';
import healthRoutes from './components/health/routes';
import newsletterSubscriptionRoutes from './components/newsletter-subscriptions/routes';
import nodeRoutes from './components/nodes/routes';
import notificationRoutes from './components/notifications/routes';
import orderHistoryRoutes from './components/order-history/routes';
import partnerPayouts from './components/partner-payouts/routes';
import paymentMethodRoutes from './components/payment-methods/routes';
import planRoutes from './components/plans/routes';
import pricingCostInputs from './components/pricing-cost-inputs/routes';
import processRoutes from './components/processes/routes';
import productDesignRoutes = require('./components/product-designs/routes');
import productDesignVariantRoutes from './components/product-design-variants/routes';
import promoCodeRoutes from './components/promo-codes/routes';
import resolveAccountRoutes from './components/resolve-accounts/routes';
import salesReportsRoutes from './components/sales-reports/routes';
import subscriptionRoutes from './components/subscriptions/routes';
import templateDesignRoutes from './components/templates/designs/routes';
import timelineRoutes from './components/timeline/routes';
import userRoutes from './components/users/routes';
import userOnboardingRoutes from './components/user-onboardings/routes';

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
router.use('/bid-task-types', bidTaskTypeRoutes);
router.use('/bids', bidRoutes);
router.use('/collaborators', collaboratorRoutes);
router.use('/collections', collectionRoutes);
router.use('/comments', commentRoutes);
router.use('/component-relationships', componentRelationshipRoutes);
router.use('/components', componentRoutes);
router.use('/credits', creditRoutes);
router.use('/duplication', duplicationRoutes);
router.use('/health', healthRoutes);
router.use('/newsletter-subscriptions', newsletterSubscriptionRoutes);
router.use('/nodes', nodeRoutes);
router.use('/notifications', notificationRoutes);
router.use('/order-history', orderHistoryRoutes);
router.use('/partner-payout-logs', partnerPayouts);
router.use('/payment-methods', paymentMethodRoutes);
router.use('/plans', planRoutes);
router.use('/pricing-cost-inputs', pricingCostInputs);
router.use('/processes', processRoutes);
router.use('/product-design-canvas-annotations', annotationRoutes);
router.use(
  '/product-design-canvas-annotations/:annotationId/comments',
  annotationCommentRoutes
);
router.use('/product-design-canvases', canvasRoutes);
router.use('/product-design-images', assetRoutes);
router.use('/product-designs', productDesignRoutes);
router.use('/product-design-variants', productDesignVariantRoutes);
router.use('/promo-codes', promoCodeRoutes);
router.use('/resolve-accounts', resolveAccountRoutes);
router.use('/sales-reports', salesReportsRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/templates/designs', templateDesignRoutes);
router.use('/timelines', timelineRoutes);
router.use('/users', userRoutes);
router.use('/user-onboardings', userOnboardingRoutes);

export default router;
