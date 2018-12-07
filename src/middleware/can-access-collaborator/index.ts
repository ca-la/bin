import * as Koa from 'koa';

import * as CollaboratorsDAO from '../../dao/collaborators';
import * as CollectionsDAO from '../../dao/collections';
import * as DesignsDAO from '../../dao/product-designs';
import Collaborator from '../../domain-objects/collaborator';
import filterError = require('../../services/filter-error');
import ResourceNotFoundError from '../../errors/resource-not-found';
import {
  getCollectionPermissions,
  getDesignPermissions,
  Permissions
} from '../../services/get-permissions';
import { hasProperties } from '../../services/require-properties';

export type CollaboratorRequest =
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

async function findPermissionsFromCollectionOrDesign(
  role: string,
  userId: string,
  collectionId: string | undefined,
  designId: string | undefined
): Promise<Permissions | null> {
  if (collectionId && designId) { throw new Error('Must pass collectionId or designId, not both'); }

  if (collectionId) {
    const collection = await CollectionsDAO.findById(collectionId);
    if (!collection) {
      throw new ResourceNotFoundError(`Could not find collection ${collectionId}`);
    }
    return getCollectionPermissions(collection, role, userId);
  }
  if (designId) {
    const design = await DesignsDAO.findById(designId);
    if (!design) {
      throw new ResourceNotFoundError(`Could not find design ${designId}`);
    }

    return getDesignPermissions(design, role, userId);
  }
  return null;
}

export function* attachCollaboratorAndPermissions(
  this: Koa.Application.Context,
  collaboratorId: string
): any {
  const { role, userId } = this.state;

  const collaborator = yield CollaboratorsDAO.findById(collaboratorId);
  this.assert(collaborator, 404, 'Collaborator not found');

  const permissions = yield findPermissionsFromCollectionOrDesign(
    role,
    userId,
    collaborator.collectionId,
    collaborator.designId
  );
  this.state.collaborator = collaborator;
  this.state.permissions = permissions;
}

export function* canAccessViaDesignOrCollectionInQuery(
  this: Koa.Application.Context,
  next: () => Promise<any>
): IterableIterator<any> {
  const { collectionId, designId } = this.query;

  if (collectionId && designId) {
    this.throw(400, 'Must pass exactly one of collection ID / design ID');
  }

  const { role, userId } = this.state;
  const permissions = yield findPermissionsFromCollectionOrDesign(
    role,
    userId,
    collectionId,
    designId
  ).catch(filterError(ResourceNotFoundError, (err: ResourceNotFoundError) =>
    this.throw(400, err)
  ));

  this.state.permissions = permissions;
  this.assert(
    permissions && permissions.canView,
    403,
    "You don't have permission to view collaborators in this context"
  );
  yield next;
}

export function* canAccessViaDesignOrCollectionInRequestBody(
  this: Koa.Application.Context,
  next: () => Promise<any>
): IterableIterator<any> {
  if (!isCollaboratorRequest(this.request.body)) {
    return this.throw(400, 'A design or collection id must be specified in the request!');
  }
  const { collectionId, designId } = this.request.body;
  if (collectionId && designId) {
    this.throw(400, 'Must pass exactly one of collection ID / design ID');
  }

  const { role, userId } = this.state;
  const permissions = yield findPermissionsFromCollectionOrDesign(
    role,
    userId,
    collectionId,
    designId
  ).catch(filterError(ResourceNotFoundError, (err: ResourceNotFoundError) =>
    this.throw(400, err)
  ));

  this.state.permissions = permissions;
  this.assert(
    permissions && permissions.canView,
    403,
    "You don't have permission to view collaborators in this context"
  );
  yield next;
}

export function* canAccessCollaboratorInParam(
  this: Koa.Application.Context,
  next: () => Promise<any>
): IterableIterator<any> {
  const { collaboratorId } = this.params;
  yield attachCollaboratorAndPermissions.call(this, collaboratorId);

  const { permissions } = this.state;
  this.assert(
    permissions && permissions.canView,
    403,
    "You don't have permission to view collaborators in this context"
  );

  yield next;
}

export function* canEditCollaborators(
  this: Koa.Application.Context,
  next: () => Promise<any>
): any {
  const { permissions } = this.state;
  if (!permissions) {
    throw new Error(
      'canEditCollaborators must be chained with middleware that attaches permissions!'
    );
  }

  this.assert(
    permissions.canEdit,
    403,
    "You don't have permission to edit collaborators in this context"
  );

  yield next;
}