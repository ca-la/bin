
'use strict';

const Router = require('koa-router');
const pick = require('lodash/pick');

const InvalidDataError = require('../../errors/invalid-data');
const ProductDesignsDAO = require('../../dao/product-designs');
const ProductDesignSelectedOptionsDAO = require('../../dao/product-design-selected-options');
const requireAuth = require('../../middleware/require-auth');
const User = require('../../domain-objects/user');

const router = new Router();

function* canAccessSelectedOption(next) {
  const selectedOption = yield ProductDesignSelectedOptionsDAO.findById(
    this.params.selectedOptionId
  );
  this.assert(selectedOption, 404);

  const design = yield ProductDesignsDAO.findById(selectedOption.designId);
  this.assert(design, 500);
  this.assert(
    this.state.userId === design.userId ||
    this.state.role === User.ROLES.admin
  , 403);

  this.state.selectedOption = selectedOption;

  yield next;
}

function* create() {
  const allowedAttrs = pick(this.request.body,
    'designId',
    'panelId',
    'optionId',
    'unitsRequiredPerGarment'
  );

  const attrs = Object.assign({}, allowedAttrs, {
    userId: this.state.userId
  });

  const option = yield ProductDesignSelectedOptionsDAO.create(attrs)
    .catch(InvalidDataError, err => this.throw(404, err));

  this.body = option;
  this.status = 201;
}

function* getByDesign() {
  const { designId } = this.query;
  this.assert(designId, 403, 'Design ID required');

  const design = yield ProductDesignsDAO.findById(designId);
  this.assert(design, 400, 'Invalid design ID');
  this.assert(this.state.userId === design.userId, 403);

  const options = yield ProductDesignSelectedOptionsDAO.findByDesignId(designId);
  this.body = options;
  this.status = 200;
}

function* deleteSelectedOption() {
  yield ProductDesignSelectedOptionsDAO.deleteById(this.params.optionId);
  this.status = 204;
}

function* update() {
  const allowedAttrs = pick(this.request.body,
    'panelId',
    'optionId',
    'unitsRequiredPerGarment'
  );

  const updated = yield ProductDesignSelectedOptionsDAO.update(
    this.params.optionId,
    allowedAttrs
  );

  this.body = updated;
  this.status = 200;
}

router.post('/', requireAuth, create);
router.get('/', requireAuth, getByDesign);
router.del('/:optionId', requireAuth, canAccessSelectedOption, deleteSelectedOption);
router.patch('/:optionId', requireAuth, canAccessSelectedOption, update);

module.exports = router.routes();
