import * as Router from 'koa-router';
import * as Koa from 'koa';

import addCollaborator from '../../services/add-collaborator';
import InvalidDataError = require('../../errors/invalid-data');
import * as CollaboratorsDAO from '../../dao/collaborators';
import Collaborator,
{
  isRole,
  Roles
} from '../../domain-objects/collaborator';
import requireAuth = require('../../middleware/require-auth');
import { attachDesignPermissions } from '../../middleware/can-access-design';
import {
  canAccessCollectionId
} from '../../middleware/can-access-collection';
import { hasProperties } from '../../services/require-properties';

const router = new Router();

type CollaboratorRequest =
  Pick<Collaborator, 'role' | 'userEmail' | 'invitationMessage'>
    & { collectionId?: string, designId?: string };

export function isCollaboratorRequest(data: object): data is CollaboratorRequest {
  const keys = Object.keys(data);
  if (!keys.includes('collectionId') && !keys.includes('designId')) {
    return false;
  }
  return hasProperties(
    data,
    'role',
    'userEmail'
  );
}

function* create(this: Koa.Application.Context): AsyncIterableIterator<Collaborator> {
  if (!this.request.body || !isCollaboratorRequest(this.request.body)) {
    return this.throw(400, 'Request does not match Collaborator');
  }
  const {
    collectionId,
    designId,
    invitationMessage,
    role,
    userEmail
  } = this.request.body;
  if (!userEmail) {
    return this.throw(400, 'Request does not include email');
  }

  if (designId) {
    yield attachDesignPermissions.call(this, designId);
  }

  if (collectionId) {
    yield canAccessCollectionId.call(this, collectionId);
  }

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

interface CollaboratorUpdate {
  role: Roles;
}

const isCollaboratorUpdate = (data: object): data is CollaboratorUpdate => {
  return hasProperties(data, 'role');
};

function* update(this: Koa.Application.Context): AsyncIterableIterator<Collaborator> {
  const collaborator = yield CollaboratorsDAO.findById(this.params.collaboratorId);
  if (!isCollaboratorUpdate(this.request.body)) {
    return this.throw(400, 'Request does not have a role');
  }
  this.assert(collaborator, 404, 'Collaborator not found');
  let canAccessDesign = false;
  let canAccessCollection = false;
  try {
    yield attachDesignPermissions.call(this, collaborator.designId);
    canAccessDesign = true;
  } catch (e) {
    canAccessDesign = false;
  }
  try {
    yield canAccessCollectionId.call(this, collaborator.collectionId);
    canAccessCollection = true;
  } catch (e) {
    canAccessCollection = false;
  }

  if (!canAccessCollection && !canAccessDesign) {
    this.throw(404, 'Design or Collection not found');
  }

  const updated = yield CollaboratorsDAO.update(
    this.params.collaboratorId,
    {
      role: this.request.body.role
    }
  );

  this.status = 200;
  this.body = updated;
}

function* find(this: Koa.Application.Context): AsyncIterableIterator<Collaborator> {
  const { designId, collectionId } = this.query;

  let collaborators;

  if (designId) {
    yield attachDesignPermissions.call(this, designId);
    collaborators = yield CollaboratorsDAO.findByDesign(designId);
  } else if (collectionId) {
    yield canAccessCollectionId.call(this, collectionId);
    collaborators = yield CollaboratorsDAO.findByCollection(collectionId);
  } else {
    this.throw(400, 'Design or collection IDs must be specified');
  }

  this.status = 200;
  this.body = collaborators;
}

function* deleteCollaborator(this: Koa.Application.Context): AsyncIterableIterator<Collaborator> {
  const collaborator = yield CollaboratorsDAO.findById(this.params.collaboratorId);
  this.assert(collaborator, 404, 'Collaborator not found');

  if (collaborator.designId) {
    yield attachDesignPermissions.call(this, collaborator.designId);
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
