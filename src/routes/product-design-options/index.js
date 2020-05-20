"use strict";

const Router = require("koa-router");
const pick = require("lodash/pick");

const filterError = require("../../services/filter-error");
const deserializeQuery = require("../../services/deserialize-query");
const InvalidDataError = require("../../errors/invalid-data");
const ProductDesignImagesDAO = require("../../components/assets/dao");
const ProductDesignOptionsDAO = require("../../dao/product-design-options");
const requireAuth = require("../../middleware/require-auth");

const router = new Router();

const ALLOWED_ATTRS = [
  "patternImageId",
  "perMeterCostCents",
  "preferredLengthUnit",
  "preferredWeightUnit",
  "previewImageId",
  "sku",
  "title",
  "type",
  "unitCostCents",
  "vendorName",
  "weightGsm",
];

function attachImages(option) {
  let attaching = Promise.resolve();

  if (option.previewImageId) {
    attaching = attaching
      .then(() => ProductDesignImagesDAO.findById(option.previewImageId))
      .then((previewImage) => option.setPreviewImage(previewImage));
  }

  if (option.patternImageId) {
    attaching = attaching
      .then(() => ProductDesignImagesDAO.findById(option.patternImageId))
      .then((patternImage) => option.setPatternImage(patternImage));
  }

  return attaching.then(() => option);
}

function* canModifyOption(next) {
  const option = yield ProductDesignOptionsDAO.findById(
    this.params.optionId
  ).catch(filterError(InvalidDataError, (err) => this.throw(404, err)));

  this.assert(option, 404);

  this.assert(this.state.userId === option.userId, 403);

  this.state.option = option;

  yield next;
}

function* create() {
  const allowedAttrs = pick(this.request.body, ALLOWED_ATTRS, "id");

  const attrs = Object.assign({}, allowedAttrs, {
    userId: this.state.userId,
  });

  const option = yield ProductDesignOptionsDAO.create(attrs).catch(
    filterError(InvalidDataError, (err) => this.throw(404, err))
  );

  this.body = yield attachImages(option);
  this.status = 201;
}

function* getList() {
  const options = yield ProductDesignOptionsDAO.findForUser(
    this.state.userId,
    deserializeQuery(
      { limit: null, offset: null, search: null },
      { limit: Number, offset: Number },
      {
        limit: (n) => !Number.isNaN(n),
        offset: (n) => !Number.isNaN(n),
      },
      {
        limit: this.query.limit,
        offset: this.query.offset,
        search: this.query.search,
      }
    )
  );
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
  const option = yield ProductDesignOptionsDAO.deleteById(this.params.optionId);
  this.assert(option, 404);
  this.status = 204;
}

function* update() {
  const allowedAttrs = pick(this.request.body, ALLOWED_ATTRS);

  const updated = yield ProductDesignOptionsDAO.update(
    this.params.optionId,
    allowedAttrs
  );

  this.body = yield attachImages(updated);
  this.status = 200;
}

router.post("/", requireAuth, create);
router.get("/", requireAuth, getList);
router.get("/:optionId", requireAuth, getById);
router.del("/:optionId", requireAuth, canModifyOption, deleteOption);
router.patch("/:optionId", requireAuth, canModifyOption, update);

module.exports = router.routes();
