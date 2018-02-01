'use strict';

const Router = require('koa-router');

const requireAuth = require('../../middleware/require-auth');
const { canAccessDesignInQuery } = require('../../middleware/can-access-design');
const ProductDesignServicesDAO = require('../../dao/product-design-services');

const router = new Router();

/**
 * PUT /product-design-services
 */
function* replaceServices() {
  const services = yield ProductDesignServicesDAO.replaceForDesign(
    this.query.designId,
    this.request.body
  );
  this.body = services;
  this.status = 200;
}

/**
 * GET /product-design-services
 */
function* getServices() {
  this.body = yield ProductDesignServicesDAO.findByDesignId(this.query.designId);
  this.status = 200;
}

/**
 * PATCH /product-design-services/:serviceId
 */
function* updateService() {
  const updated = yield ProductDesignServicesDAO.update(this.params.serviceId, this.request.body);
  this.body = updated;
  this.status = 200;
}

router.put('/', requireAuth, canAccessDesignInQuery, replaceServices);
router.get('/', requireAuth, canAccessDesignInQuery, getServices);
router.patch('/:serviceId', requireAuth, updateService);

module.exports = router.routes();
