'use strict';

const Router = require('koa-router');

const addDesignCollaborator = require('../../services/add-design-collaborator');
const ProductDesignCollaboratorsDAO = require('../../dao/product-design-collaborators');
const requireAuth = require('../../middleware/require-auth');
const { canAccessDesignId, canAccessDesignInQuery } = require('../../middleware/can-access-design');

const router = new Router();

function* create() {
  const { designId, userEmail, role, invitationMessage } = this.request.body;

  yield canAccessDesignId(designId);

  const created = yield addDesignCollaborator(
    designId,
    userEmail,
    role,
    invitationMessage
  );

  this.status = 201;
  this.body = created;
}

function* update() {
  const collaborator = yield ProductDesignCollaboratorsDAO.findById(this.params.collaboratorId);
  yield canAccessDesignId(collaborator.designId);

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
  yield canAccessDesignId(collaborator.designId);

  yield ProductDesignCollaboratorsDAO.deleteById(this.params.collaboratorId);

  this.status = 204;
}

router.post('/', requireAuth, create);
router.get('/', requireAuth, canAccessDesignInQuery, findByDesign);
router.patch('/:collaboratorId', requireAuth, update);
router.del('/:collaboratorId', requireAuth, deleteCollaborator);

module.exports = router.routes();
