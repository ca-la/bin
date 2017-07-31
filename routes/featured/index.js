'use strict';

const Router = require('koa-router');

const {
  FEATURED_PRODUCT_IDS,
  FEATURED_COLLECTION_LISTS
} = require('../../config');

const router = new Router();

// eslint-disable-next-line require-yield
function* getFeatured() {
  this.status = 200;
  this.body = {
    productIds: FEATURED_PRODUCT_IDS,
    collectionLists: FEATURED_COLLECTION_LISTS
  };
}

// eslint-disable-next-line require-yield
function* getAppBanner() {
  const appOpenCount = Number(this.query.appOpenCount) || 0;
  const appInstalledForSeconds = Number(this.query.appInstalledForSeconds) || 0;

  const installTimeMinutes = appInstalledForSeconds / 60;

  if (appOpenCount > 1 && installTimeMinutes > 2) {
    this.status = 200;

    this.body = {
      title: 'Get $30 off your first order',
      subtitle: 'plus be the first to get new designer updates',
      buttonText: 'Sign Up'
    };
  } else {
    this.status = 204;
    this.body = null;
  }

  return null;
}

router.get('/', getFeatured);
router.get('/app-banner', getAppBanner);

module.exports = router.routes();
