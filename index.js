'use strict';

const koa = require('koa');
const Router = require('koa-router');

const app = koa();

const errors = require('./middleware/errors');
const jsonBody = require('./middleware/json-body');
const headers = require('./middleware/headers');
const logger = require('./middleware/logger');
const options = require('./middleware/options');
const attachSession = require('./middleware/attach-session');

app.use(logger);
app.use(errors);
app.use(jsonBody);
app.use(headers);
app.use(options);
app.use(attachSession);

const router = new Router({
  prefix: '/:version(v1)?'
});

router.use('/addresses', require('./routes/addresses'));
router.use('/collection-photos', require('./routes/collection-photos'));
router.use('/collections', require('./routes/collections'));
router.use('/designers', require('./routes/designers'));
router.use('/download-links', require('./routes/download-links'));
router.use('/featured', require('./routes/featured'));
router.use('/instagram-feed', require('./routes/instagram-feed'));
router.use('/orders', require('./routes/orders'));
router.use('/password-resets', require('./routes/password-resets'));
router.use('/product-design-collaborators', require('./routes/product-design-collaborators'));
router.use('/product-design-images', require('./routes/product-design-images'));
router.use('/product-design-options', require('./routes/product-design-options'));
router.use('/product-design-selected-options', require('./routes/product-design-selected-options'));
router.use('/product-design-services', require('./routes/product-design-services'));
router.use('/product-design-status-updates', require('./routes/product-design-status-updates'));
router.use('/product-design-variants', require('./routes/product-design-variants'));
router.use('/product-designs', require('./routes/product-designs'));
router.use('/product-videos', require('./routes/product-videos'));
router.use('/production-prices', require('./routes/production-prices'));
router.use('/products', require('./routes/products'));
router.use('/push-tokens', require('./routes/push-tokens'));
router.use('/scan-photos', require('./routes/scan-photos'));
router.use('/scans', require('./routes/scans'));
router.use('/sessions', require('./routes/sessions'));
router.use('/shopify-webhooks', require('./routes/shopify-webhooks'));
router.use('/subscriptions', require('./routes/subscriptions'));
router.use('/twilio-webhooks', require('./routes/twilio-webhooks'));
router.use('/users', require('./routes/users'));
router.use('/zips', require('./routes/zips'));
router.use(require('./routes/root'));

app.use(router.routes());

if (!module.parent) {
  const port = process.env.PORT || 8001;
  app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Running on :${port}`);
}

module.exports = app;
