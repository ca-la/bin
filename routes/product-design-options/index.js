'use strict';

const Router = require('koa-router');
const pick = require('lodash/pick');

const InvalidDataError = require('../../errors/invalid-data');
const ProductDesignImagesDAO = require('../../dao/product-design-images');
const ProductDesignOptionsDAO = require('../../dao/product-design-options');
const requireAuth = require('../../middleware/require-auth');

const router = new Router();

function attachImages(option) {
  let attaching = Promise.resolve();

  if (option.previewImageId) {
    attaching = attaching
      .then(() => ProductDesignImagesDAO.findById(option.previewImageId))
      .then(previewImage => option.setPreviewImage(previewImage));
  }

  if (option.patternImageId) {
    attaching = attaching
      .then(() => ProductDesignImagesDAO.findById(option.patternImageId))
      .then(patternImage => option.setPatternImage(patternImage));
  }

  return attaching.then(() => option);
}

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
    'preferredLengthUnit',
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

  this.body = yield attachImages(option);
  this.status = 201;
}

function* getList() {
  const options = yield ProductDesignOptionsDAO.findForUser(this.state.userId);
  const optionsWithImages = yield Promise.all(options.map(attachImages));

  this.body = optionsWithImages;
  this.status = 200;
}

function* getById() {
  const option = yield ProductDesignOptionsDAO.findById(this.params.optionId);
  this.assert(option, 404);
  this.body = yield attachImages(option);
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
    'preferredLengthUnit',
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

  this.body = yield attachImages(updated);
  this.status = 200;
}

router.post('/', requireAuth, create);
router.get('/', requireAuth, getList);
router.get('/:optionId', requireAuth, getById);
router.del('/:optionId', requireAuth, canModifyOption, deleteOption);
router.patch('/:optionId', requireAuth, canModifyOption, update);

module.exports = router.routes();
