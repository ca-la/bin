'use strict';

const Router = require('koa-router');

const requireAuth = require('../../middleware/require-auth');
const { canAccessDesignInQuery } = require('../../middleware/can-access-design');
const ProductDesignVariantsDAO = require('../../dao/product-design-variants');

const router = new Router();

function* replaceVariants() {
  const variants = yield ProductDesignVariantsDAO.replaceForDesign(
    this.query.designId,
    this.request.body
  );
  this.body = variants;
  this.status = 200;
}

function* getVariants() {
  this.body = yield ProductDesignVariantsDAO.findByDesignId(this.query.designId);
  this.status = 200;
}

router.put('/', requireAuth, canAccessDesignInQuery, replaceVariants);
router.get('/', requireAuth, canAccessDesignInQuery, getVariants);

module.exports = router.routes();
