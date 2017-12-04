'use strict';

const Router = require('koa-router');

const requireAuth = require('../../middleware/require-auth');
const { canAccessDesignInQuery } = require('../../middleware/can-access-design');
const ProductDesignServicesDAO = require('../../dao/product-design-services');

const router = new Router();

function* replaceServices() {
  const services = yield ProductDesignServicesDAO.replaceForDesign(
    this.query.designId,
    this.request.body
  );
  this.body = services;
  this.status = 200;
}

function* getServices() {
  this.body = yield ProductDesignServicesDAO.findByDesignId(this.query.designId);
  this.status = 200;
}

router.put('/', requireAuth, canAccessDesignInQuery, replaceServices);
router.get('/', requireAuth, canAccessDesignInQuery, getServices);

module.exports = router.routes();
