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

// General middleware
app.use(logger);
app.use(errors);
app.use(jsonBody);
app.use(headers);
app.use(options);
app.use(attachSession);

const router = new Router({
  prefix: '/:version(v1)?'
});

// Route-specific middleware
router.use(require('./routes/root'));
router.use('/addresses', require('./routes/addresses'));
router.use('/collections', require('./routes/collections'));
router.use('/download-links', require('./routes/download-links'));
router.use('/featured', require('./routes/featured'));
router.use('/instagram-feed', require('./routes/instagram-feed'));
router.use('/orders', require('./routes/orders'));
router.use('/password-resets', require('./routes/password-resets'));
router.use('/product-videos', require('./routes/product-videos'));
router.use('/products', require('./routes/products'));
router.use('/push-tokens', require('./routes/push-tokens'));
router.use('/scan-photos', require('./routes/scan-photos'));
router.use('/scans', require('./routes/scans'));
router.use('/sessions', require('./routes/sessions'));
router.use('/subscriptions', require('./routes/subscriptions'));
router.use('/users', require('./routes/users'));
router.use('/zips', require('./routes/zips'));

app.use(router.routes());

if (!module.parent) {
  const port = process.env.PORT || 5100;
  app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Running on :${port}`);
}

module.exports = app;
