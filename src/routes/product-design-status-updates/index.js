'use strict';

const Router = require('koa-router');

const ProductDesignStatusUpdatesDAO = require('../../dao/product-design-status-updates');
const requireAuth = require('../../middleware/require-auth');
const { attachDesignPermissions } = require('../../middleware/can-access-design');

const router = new Router();

function* getByDesign() {
  const { designId } = this.query;
  this.assert(designId, 403, 'Design ID required');

  yield attachDesignPermissions.call(this, designId);

  const updates = yield ProductDesignStatusUpdatesDAO.findByDesign(designId);
  this.body = updates;
  this.status = 200;
}

router.get('/', requireAuth, getByDesign);

module.exports = router.routes();
