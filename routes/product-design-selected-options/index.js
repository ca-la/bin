'use strict';

const Router = require('koa-router');
const pick = require('lodash/pick');

const InvalidDataError = require('../../errors/invalid-data');
const ProductDesignSelectedOptionsDAO = require('../../dao/product-design-selected-options');
const requireAuth = require('../../middleware/require-auth');
const { canAccessDesignId } = require('../../middleware/can-access-design');

const router = new Router();

const ALLOWED_ATTRS = [
  'designId',
  'panelId',
  'sectionId',
  'optionId',
  'unitsRequiredPerGarment',
  'fabricDyeProcessName',
  'fabricDyeProcessColor',
  'fabricWashProcessName',
  'fabricCustomProcessNames',
  'garmentComponentName'
];

function* canAccessSelectedOption(next) {
  const selectedOption = yield ProductDesignSelectedOptionsDAO.findById(
    this.params.optionId
  );
  this.assert(selectedOption, 404);

  yield canAccessDesignId.call(this, selectedOption.designId);

  this.state.selectedOption = selectedOption;

  yield next;
}

function* create() {
  const allowedAttrs = pick(this.request.body, ALLOWED_ATTRS);

  const option = yield ProductDesignSelectedOptionsDAO.create(allowedAttrs)
    .catch(InvalidDataError, err => this.throw(404, err));

  this.body = option;
  this.status = 201;
}

function* getByDesign() {
  const { designId } = this.query;
  this.assert(designId, 403, 'Design ID required');

  yield canAccessDesignId.call(this, designId);

  const options = yield ProductDesignSelectedOptionsDAO.findByDesignId(designId);
  this.body = options;
  this.status = 200;
}

function* deleteSelectedOption() {
  yield ProductDesignSelectedOptionsDAO.deleteById(this.params.optionId);
  this.status = 204;
}

function* update() {
  const allowedAttrs = pick(this.request.body, ALLOWED_ATTRS);

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
