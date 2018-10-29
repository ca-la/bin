'use strict';

const Router = require('koa-router');

const addCollaborator = require('../../services/add-collaborator');
const InvalidDataError = require('../../errors/invalid-data');
const CollaboratorsDAO = require('../../dao/collaborators');
const Collaborator = require('../../domain-objects/collaborator');
const requireAuth = require('../../middleware/require-auth');
const { canAccessDesignId } = require('../../middleware/can-access-design');
const { canAccessCollectionId } = require('../../middleware/can-access-collection');

const router = new Router();

function* create() {
  const {
    collectionId,
    designId,
    invitationMessage,
    role,
    userEmail
  } = this.request.body;

  if (designId) {
    yield canAccessDesignId.call(this, designId);
  }

  if (collectionId) {
    yield canAccessCollectionId.call(this, collectionId);
  }

  const roles = Object.values(Collaborator.ROLES);
  this.assert(roles.includes(role), 400, `Unknown role: ${role}`);

  const created = yield addCollaborator({
    inviterUserId: this.state.userId,
    collectionId,
    designId,
    email: userEmail,
    invitationMessage,
    role
  })
    .catch((err) => {
      if (err instanceof InvalidDataError) {
        this.throw(400, err);
      }

      throw err;
    });

  this.status = 201;
  this.body = created;
}

function* update() {
  const collaborator = yield CollaboratorsDAO.findById(this.params.collaboratorId);
  this.assert(collaborator, 404, 'Collaborator not found');
  yield canAccessDesignId.call(this, collaborator.designId);

  const updated = yield CollaboratorsDAO.update(
    this.params.collaboratorId,
    {
      role: this.request.body.role
    }
  );

  this.status = 200;
  this.body = updated;
}

function* find() {
  const { designId, collectionId } = this.query;

  let collaborators;

  if (this.query.designId) {
    yield canAccessDesignId.call(this, designId);
    collaborators = yield CollaboratorsDAO.findByDesign(designId);
  } else if (this.query.collectionId) {
    yield canAccessCollectionId.call(this, collectionId);
    collaborators = yield CollaboratorsDAO.findByCollection(collectionId);
  } else {
    this.throw(400, 'Design or collection IDs must be specified');
  }

  this.status = 200;
  this.body = collaborators;
}

function* deleteCollaborator() {
  const collaborator = yield CollaboratorsDAO.findById(this.params.collaboratorId);
  this.assert(collaborator, 404, 'Collaborator not found');

  if (collaborator.designId) {
    yield canAccessDesignId.call(this, collaborator.designId);
  }

  if (collaborator.collectionId) {
    yield canAccessCollectionId.call(this, collaborator.collectionId);
  }

  yield CollaboratorsDAO.deleteById(this.params.collaboratorId);

  this.status = 204;
}

router.post('/', requireAuth, create);
router.get('/', requireAuth, find);
router.patch('/:collaboratorId', requireAuth, update);
router.del('/:collaboratorId', requireAuth, deleteCollaborator);

module.exports = router.routes();
