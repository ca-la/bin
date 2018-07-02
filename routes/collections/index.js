'use strict';

const Router = require('koa-router');

const filterError = require('../../services/filter-error');
const InvalidDataError = require('../../errors/invalid-data');
const canAccessUserResource = require('../../middleware/can-access-user-resource');
const CollectionsDAO = require('../../dao/collections');
const ProductDesignsDAO = require('../../dao/product-designs');
const requireAuth = require('../../middleware/require-auth');

const router = new Router();

function* createCollection() {
  const data = Object.assign({}, this.request.body, {
    createdBy: this.state.userId
  });
  const collection = yield CollectionsDAO
    .create(data)
    .catch(filterError(InvalidDataError, err => this.throw(400, err)));

  this.body = collection;
  this.status = 201;
}

function* getCollection() {
  const { collectionId } = this.params;

  const collection = yield CollectionsDAO.findById(collectionId);
  canAccessUserResource.call(this, collection.createdBy);

  this.body = collection;
  this.status = 200;
}

function* getCollections() {
  const { userId } = this.query;
  canAccessUserResource.call(this, userId);

  this.body = yield CollectionsDAO.findByUserId(userId);

  this.status = 200;
}

function* deleteCollection() {
  const { collectionId } = this.params;

  const targetCollection = yield CollectionsDAO.findById(collectionId);
  canAccessUserResource.call(this, targetCollection.createdBy);

  yield CollectionsDAO.deleteById(collectionId);

  this.status = 200;
}

function* putDesign() {
  const { collectionId, designId } = this.params;

  const targetCollection = yield CollectionsDAO.findById(collectionId);
  const targetDesign = yield ProductDesignsDAO.findById(designId);
  canAccessUserResource.call(this, targetCollection.createdBy);
  canAccessUserResource.call(this, targetDesign.userId);

  this.body = yield CollectionsDAO.addDesign(collectionId, designId);
  this.status = 200;
}

function* deleteDesign() {
  const { collectionId, designId } = this.params;

  const targetCollection = yield CollectionsDAO.findById(collectionId);
  const targetDesign = yield ProductDesignsDAO.findById(designId);
  canAccessUserResource.call(this, targetCollection.createdBy);
  canAccessUserResource.call(this, targetDesign.userId);

  this.body = yield CollectionsDAO.removeDesign(collectionId, designId);
  this.status = 200;
}

router.post('/', requireAuth, createCollection);
router.get('/', requireAuth, getCollections);

router.del('/:collectionId', requireAuth, deleteCollection);
router.get('/:collectionId', requireAuth, getCollection);

router.put('/:collectionId/designs/:designId', requireAuth, putDesign);
router.del('/:collectionId/designs/:designId', requireAuth, deleteDesign);

module.exports = router.routes();
