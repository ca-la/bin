import * as Router from 'koa-router';
import * as Koa from 'koa';

import addCollaborator from '../../services/add-collaborator';
import InvalidDataError = require('../../errors/invalid-data');
import * as CollaboratorsDAO from './dao';
import { isRole, Roles } from './domain-objects/collaborator';
import requireAuth = require('../../middleware/require-auth');
import { hasProperties } from '../../services/require-properties';
import * as CollaboratorsMiddleware from '../../middleware/can-access-collaborator';
import {
  CollaboratorWithUserMeta,
  CollaboratorWithUserMetaByDesign
} from './domain-objects/collaborator-by-design';

const router = new Router();

interface CollaboratorUpdate {
  role: Roles;
}

/**
 * Determines whether the given user is a collaborator on all the designs in the list.
 */
function isCollaboratorOnAllDesigns(
  userId: string,
  collaboratorsByDesignList: CollaboratorWithUserMetaByDesign[]
): boolean {
  return collaboratorsByDesignList.reduce(
    (
      acc: boolean,
      collaboratorsByDesign: CollaboratorWithUserMetaByDesign
    ): boolean => {
      const isCollaborator = collaboratorsByDesign.collaborators.some(
        (collaborator: CollaboratorWithUserMeta) =>
          collaborator.userId === userId
      );
      return acc && isCollaborator;
    },
    true
  );
}

const isCollaboratorUpdate = (data: object): data is CollaboratorUpdate => {
  return hasProperties(data, 'role');
};

function* create(this: Koa.Application.Context): IterableIterator<any> {
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

  if (!userEmail) {
    return this.throw(400, 'Request does not include email');
  }
  this.assert(isRole(role), 400, `Unknown role: ${role}`);

  const created = yield addCollaborator({
    collectionId,
    designId,
    email: userEmail,
    inviterUserId: this.state.userId,
    role,
    unsafeInvitationMessage: invitationMessage
  }).catch((err: Error) => {
    if (err instanceof InvalidDataError) {
      this.throw(400, err);
    }

    throw err;
  });

  this.status = 201;
  this.body = created;
}

function* find(this: Koa.Application.Context): IterableIterator<any> {
  const { collectionId, designId, designIds } = this.query;
  const { userId } = this.state;
  let collaborators;

  if (designId) {
    collaborators = yield CollaboratorsDAO.findByDesign(designId);
  } else if (collectionId) {
    collaborators = yield CollaboratorsDAO.findByCollection(collectionId);
  } else if (designIds) {
    const idList = designIds.split(',');
    const collaboratorsByDesign = yield CollaboratorsDAO.findByDesigns(idList);
    const hasAccess = isCollaboratorOnAllDesigns(userId, collaboratorsByDesign);

    if (!hasAccess) {
      this.throw(
        403,
        'You are not allowed to view collaborators for the given designs!'
      );
    }

    collaborators = collaboratorsByDesign;
  } else {
    this.throw(400, 'Design or collection IDs must be specified');
  }

  this.status = 200;
  this.body = collaborators;
}

function* update(this: Koa.Application.Context): IterableIterator<any> {
  const { collaborator } = this.state;
  const { body } = this.request;
  if (!collaborator) {
    return this.throw(400, 'Could not find Collaborator!');
  }
  if (!isCollaboratorUpdate(body)) {
    return this.throw(400, 'Request does not have a role');
  }
  this.assert(isRole(body.role), 400, `Unknown role: ${body.role}`);

  const updated = yield CollaboratorsDAO.update(collaborator.id, {
    role: body.role
  });
  this.status = 200;
  this.body = updated;
}

function* deleteCollaborator(
  this: Koa.Application.Context
): IterableIterator<any> {
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
  CollaboratorsMiddleware.canAccessViaQueryParameters,
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
