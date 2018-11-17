'use strict';

const Router = require('koa-router');
const pick = require('lodash/pick');
const uuid = require('node-uuid');

const filterError = require('../../services/filter-error');
const InvalidDataError = require('../../errors/invalid-data');
const canAccessUserResource = require('../../middleware/can-access-user-resource');
const CollectionsDAO = require('../../dao/collections');
const CollaboratorsDAO = require('../../dao/collaborators');
const CollectionServicesDAO = require('../../dao/collection-services');
const ProductDesignsDAO = require('../../dao/product-designs');
const DesignEventsDAO = require('../../dao/design-events');
const CollectionServiceObject = require('../../domain-objects/collection-service');
const { UPDATABLE_PARAMS } = require('../../domain-objects/collection');
const requireAuth = require('../../middleware/require-auth');
const { CALA_ADMIN_USER_ID } = require('../../config');
const CreateNotifications = require('../../services/create-notifications');

const router = new Router();

async function attachRole(requestorId, design) {
  const requestorAsCollaborator = await CollaboratorsDAO
    .findByDesignAndUser(design.id, requestorId);

  if (!requestorAsCollaborator || requestorAsCollaborator.length === 0) {
    return design;
  }

  design.setRole(requestorAsCollaborator[0].role);
  return design;
}

function* createCollection() {
  const data = Object.assign({}, this.request.body, {
    createdBy: this.state.userId
  });
  const collection = yield CollectionsDAO
    .create(data)
    .catch(filterError(InvalidDataError, err => this.throw(400, err)));

  yield CollaboratorsDAO.create({
    collectionId: collection.id,
    role: 'EDIT',
    userId: this.state.userId
  });

  yield CollaboratorsDAO.create({
    collectionId: collection.id,
    role: 'EDIT',
    userId: CALA_ADMIN_USER_ID
  });

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

function* updateCollection() {
  const { collectionId } = this.params;
  const data = pick(this.request.body, UPDATABLE_PARAMS);
  const collection = yield CollectionsDAO
    .update(collectionId, data)
    .catch(filterError(InvalidDataError, err => this.throw(400, err)));
  this.body = collection;
  this.status = 200;
}

function* getCollections() {
  const { userId } = this.query;

  this.assert(userId, 403);
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

  try {
    this.body = yield CollectionsDAO.moveDesign(collectionId, designId);
    this.status = 200;
  } catch (error) {
    throw error;
  }
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

function* getCollectionDesigns() {
  const { collectionId } = this.params;

  const targetCollection = yield CollectionsDAO.findById(collectionId);
  canAccessUserResource.call(this, targetCollection.createdBy);

  const collectionDesigns = yield ProductDesignsDAO
    .findByCollectionId(collectionId);
  const withRoles = yield Promise.all(
    collectionDesigns.map(design => attachRole(this.state.userId, design))
  );

  this.body = withRoles;
  this.status = 200;
}

function* createSubmission() {
  const { collectionId } = this.params;
  const { userId } = this.state;

  if (CollectionServiceObject.isCollectionService(this.request.body)) {
    const collectionService = yield CollectionServicesDAO.create({
      ...this.request.body,
      createdBy: userId
    });
    const designs = yield ProductDesignsDAO.findByCollectionId(collectionId);
    yield Promise.all(designs.map((design) => {
      return DesignEventsDAO.create({
        actorId: userId,
        bidId: null,
        createdAt: new Date(),
        designId: design.id,
        id: uuid.v4(),
        targetId: null,
        type: 'SUBMIT_DESIGN'
      });
    }));

    CreateNotifications.sendDesignerSubmitCollection(collectionId, userId);

    this.status = 201;
    this.body = collectionService;
  } else {
    this.throw(400, 'Request does not match collection service');
  }
}

router.post('/', requireAuth, createCollection);
router.get('/', requireAuth, getCollections);

router.del('/:collectionId', requireAuth, deleteCollection);
router.get('/:collectionId', requireAuth, getCollection);
router.patch('/:collectionId', requireAuth, updateCollection);
router.post('/:collectionId/submissions', requireAuth, createSubmission);

router.get('/:collectionId/designs', requireAuth, getCollectionDesigns);
router.del('/:collectionId/designs/:designId', requireAuth, deleteDesign);
router.put('/:collectionId/designs/:designId', requireAuth, putDesign);

module.exports = router.routes();
