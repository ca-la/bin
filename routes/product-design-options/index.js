'use strict';

const Router = require('koa-router');
const pick = require('lodash/pick');

const InvalidDataError = require('../../errors/invalid-data');
const ProductDesignOptionsDAO = require('../../dao/product-design-options');
const requireAuth = require('../../middleware/require-auth');

const router = new Router();

function* canModifyOption(next) {
  const option = yield ProductDesignOptionsDAO.findById(this.params.optionId)
    .catch(InvalidDataError, err => this.throw(404, err));

  this.assert(option, 404);

  this.assert(this.state.userId === option.userId, 403);

  this.state.option = option;

  yield next;
}

function* create() {
  const allowedAttrs = pick(this.request.body,
    'type',
    'unitCostCents',
    'preferredCostUnit',
    'weightGsm',
    'preferredWeightUnit',
    'title',
    'sku',
    'previewImageId',
    'patternImageId',
    'vendorName'
  );

  const attrs = Object.assign({}, allowedAttrs, {
    userId: this.state.userId
  });

  const option = yield ProductDesignOptionsDAO.create(attrs)
    .catch(InvalidDataError, err => this.throw(404, err));

  this.body = option;
  this.status = 201;
}

function* getList() {
  const options = yield ProductDesignOptionsDAO.findForUser(this.state.userId);
  this.body = options;
  this.status = 200;
}

function* deleteOption() {
  yield ProductDesignOptionsDAO.deleteById(this.params.optionId);
  this.status = 204;
}

function* update() {
  const allowedAttrs = pick(this.request.body,
    'type',
    'unitCostCents',
    'preferredCostUnit',
    'weightGsm',
    'preferredWeightUnit',
    'title',
    'sku',
    'previewImageId',
    'patternImageId',
    'vendorName'
  );

  const updated = yield ProductDesignOptionsDAO.update(
    this.params.optionId,
    allowedAttrs
  );

  this.body = updated;
  this.status = 200;
}

router.post('/', requireAuth, create);
router.get('/', requireAuth, getList);
router.del('/:optionId', requireAuth, canModifyOption, deleteOption);
router.patch('/:optionId', requireAuth, canModifyOption, update);

module.exports = router.routes();
