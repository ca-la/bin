'use strict';

const Router = require('koa-router');

const canAccessFeaturePlacement = require('../../middleware/can-access-feature-placement');
const ProductDesignFeaturePlacementsDAO = require('../../dao/product-design-feature-placements');
const requireAuth = require('../../middleware/require-auth');

const router = new Router();

function* deleteFeature() {
  yield ProductDesignFeaturePlacementsDAO.deleteById(this.params.featureId);
  this.status = 204;
}

router.del('/:featureId', requireAuth, canAccessFeaturePlacement, deleteFeature);

module.exports = router.routes();
