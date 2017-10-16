'use strict';

const Router = require('koa-router');

const addDesignCollaborator = require('../../services/add-design-collaborator');
const InvalidDataError = require('../../errors/invalid-data');
const ProductDesignCollaboratorsDAO = require('../../dao/product-design-collaborators');
const requireAuth = require('../../middleware/require-auth');
const { canAccessDesignId, canAccessDesignInQuery } = require('../../middleware/can-access-design');

const router = new Router();

function* create() {
  const { designId, userEmail, role, invitationMessage } = this.request.body;

  yield canAccessDesignId.call(this, designId);

  let created;
  try {
    created = yield addDesignCollaborator(
      designId,
      userEmail,
      role,
      invitationMessage
    );
  } catch (err) {
    if (err instanceof InvalidDataError) this.throw(400, err);
  }

  this.status = 201;
  this.body = created;
}

function* update() {
  const collaborator = yield ProductDesignCollaboratorsDAO.findById(this.params.collaboratorId);
  yield canAccessDesignId.call(this, collaborator.designId);

  const updated = yield ProductDesignCollaboratorsDAO.update(
    this.params.collaboratorId,
    {
      role: this.request.body.role
    }
  );

  this.status = 200;
  this.body = updated;
}

function* findByDesign() {
  const collaborators = yield ProductDesignCollaboratorsDAO.findByDesign(this.query.designId);

  this.status = 200;
  this.body = collaborators;
}

function* deleteCollaborator() {
  const collaborator = yield ProductDesignCollaboratorsDAO.findById(this.params.collaboratorId);
  yield canAccessDesignId.call(this, collaborator.designId);

  yield ProductDesignCollaboratorsDAO.deleteById(this.params.collaboratorId);

  this.status = 204;
}

router.post('/', requireAuth, create);
router.get('/', requireAuth, canAccessDesignInQuery, findByDesign);
router.patch('/:collaboratorId', requireAuth, update);
router.del('/:collaboratorId', requireAuth, deleteCollaborator);

module.exports = router.routes();
