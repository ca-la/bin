import * as Router from 'koa-router';
import * as Koa from 'koa';

import addCollaborator from '../../services/add-collaborator';
import InvalidDataError = require('../../errors/invalid-data');
import * as CollaboratorsDAO from './dao';
import Collaborator,
{
  isRole,
  Roles
} from './domain-object';
import requireAuth = require('../../middleware/require-auth');
import { hasProperties } from '../../services/require-properties';
import * as CollaboratorsMiddleware from '../../middleware/can-access-collaborator';

const router = new Router();

interface CollaboratorUpdate {
  role: Roles;
}

const isCollaboratorUpdate = (data: object): data is CollaboratorUpdate => {
  return hasProperties(data, 'role');
};

function* create(this: Koa.Application.Context): AsyncIterableIterator<Collaborator> {
  if (!CollaboratorsMiddleware.isCollaboratorRequest(this.request.body)) {
    return this.throw(400, 'Request does not match Collaborator');
  }
  const {
    collectionId,
    designId,
    invitationMessage,
    role,
    userEmail
  } = this.request.body;

  if (!userEmail) { return this.throw(400, 'Request does not include email'); }
  this.assert(isRole(role), 400, `Unknown role: ${role}`);

  const created = yield addCollaborator({
    collectionId,
    designId,
    email: userEmail,
    inviterUserId: this.state.userId,
    role,
    unsafeInvitationMessage: invitationMessage
  })
    .catch((err: Error) => {
      if (err instanceof InvalidDataError) {
        this.throw(400, err);
      }

      throw err;
    });

  this.status = 201;
  this.body = created;
}

function* find(this: Koa.Application.Context): AsyncIterableIterator<Collaborator> {
  const { designId, collectionId } = this.query;
  let collaborators;

  if (designId) {
    collaborators = yield CollaboratorsDAO.findByDesign(designId);
  } else if (collectionId) {
    collaborators = yield CollaboratorsDAO.findByCollection(collectionId);
  } else {
    this.throw(400, 'Design or collection IDs must be specified');
  }

  this.status = 200;
  this.body = collaborators;
}

function* update(this: Koa.Application.Context): AsyncIterableIterator<Collaborator> {
  const { collaborator } = this.state;
  const { body } = this.request;
  if (!collaborator) { return this.throw(400, 'Could not find Collaborator!'); }
  if (!isCollaboratorUpdate(body)) { return this.throw(400, 'Request does not have a role'); }

  const updated = yield CollaboratorsDAO.update(collaborator.id, { role: body.role });
  this.status = 200;
  this.body = updated;
}

function* deleteCollaborator(this: Koa.Application.Context): AsyncIterableIterator<Collaborator> {
  const { collaborator } = this.state;

  if (!collaborator) {
    this.throw(404, 'Could not find Collaborator!');
  } else {
    yield CollaboratorsDAO.deleteById(collaborator.id);
    this.status = 204;
  }
}

router.post(
  '/',
  requireAuth,
  CollaboratorsMiddleware.canAccessViaDesignOrCollectionInRequestBody,
  CollaboratorsMiddleware.canEditCollaborators,
  create
);
router.get(
  '/',
  requireAuth,
  CollaboratorsMiddleware.canAccessViaDesignOrCollectionInQuery,
  find
);
router.patch(
  '/:collaboratorId',
  requireAuth,
  CollaboratorsMiddleware.canAccessCollaboratorInParam,
  CollaboratorsMiddleware.canEditCollaborators,
  update
);
router.del(
  '/:collaboratorId',
  requireAuth,
  CollaboratorsMiddleware.canAccessCollaboratorInParam,
  CollaboratorsMiddleware.canEditCollaborators,
  deleteCollaborator
);

export default router.routes();
