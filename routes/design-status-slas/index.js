'use strict';

const Router = require('koa-router');

const requireAuth = require('../../middleware/require-auth');
const { canAccessDesignInQuery } = require('../../middleware/can-access-design');
const DesignStatusSlasDAO = require('../../dao/design-status-slas');

const router = new Router();

function* replaceSlas() {
  const slas = yield DesignStatusSlasDAO.replaceForDesign(
    this.query.designId,
    this.request.body
  );
  this.body = slas;
  this.status = 200;
}

function* getSlas() {
  this.body = yield DesignStatusSlasDAO.findByDesignId(this.query.designId);
  this.status = 200;
}

router.put('/', requireAuth, canAccessDesignInQuery, replaceSlas);
router.get('/', requireAuth, canAccessDesignInQuery, getSlas);

module.exports = router.routes();
