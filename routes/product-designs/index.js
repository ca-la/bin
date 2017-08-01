'use strict';

const Router = require('koa-router');

const ProductDesignsDAO = require('../../dao/product-designs');
const ProductDesignSectionsDAO = require('../../dao/product-design-sections');
const ProductDesignImagePlacementsDAO = require('../../dao/product-design-image-placements');
const requireAuth = require('../../middleware/require-auth');
const User = require('../../domain-objects/user');

const router = new Router();

function* getDesigns() {
  const designs = yield ProductVideosDAO.findByProductIds(productIds);

  this.body = designs;
  this.status = 200;
}

function updateDesign() {
}

function deleteDesign() {
}

function* getDesignSections() {
  this.body = sections;
  this.status = 201;
}

function createSection() {
}

function deleteSection() {
}

function getSectionImagePlacements() {
}

function replaceSectionImagePlacements() {
}

router.get('/', getVideos);
router.post('/', requireAuth, createVideo);

module.exports = router.routes();
