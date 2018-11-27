import * as Koa from 'koa';

import {
  canAccessCollectionId,
  canModifyCollectionId
} from '../../middleware/can-access-collection';
import canAccessUserResource = require('../../middleware/can-access-user-resource');
import * as ProductDesignsDAO from '../../dao/product-designs';
import * as CollectionsDAO from '../../dao/collections';
import * as CollaboratorsDAO from '../../dao/collaborators';
import { Collaborator } from '../../domain-objects/collaborator';
import ProductDesign = require('../../domain-objects/product-design');

interface ProductDesignWithRole extends ProductDesign {
  role: string;
}

async function attachRole(
  requestorId: string,
  design: ProductDesign
): Promise<ProductDesign | ProductDesignWithRole> {
  const requestorAsCollaborator: Collaborator[] = await CollaboratorsDAO.findByDesignAndUser(
    design.id,
    requestorId
  );

  if (requestorAsCollaborator.length > 0) {
    return { ...design, role: requestorAsCollaborator[0].role };
  }

  return design;
}

export function* putDesign(this: Koa.Application.Context): AsyncIterableIterator<void> {
  const { collectionId, designId } = this.params;

  canModifyCollectionId.call(this, collectionId);
  const targetDesign = yield ProductDesignsDAO.findById(designId);
  canAccessUserResource.call(this, targetDesign.userId);

  try {
    this.body = yield CollectionsDAO.moveDesign(collectionId, designId);
    this.status = 200;
  } catch (error) {
    throw error;
  }
}

export function* deleteDesign(this: Koa.Application.Context): AsyncIterableIterator<void> {
  const { collectionId, designId } = this.params;

  canModifyCollectionId.call(this, collectionId);
  const targetDesign = yield ProductDesignsDAO.findById(designId);
  canAccessUserResource.call(this, targetDesign.userId);

  this.body = yield CollectionsDAO.removeDesign(collectionId, designId);
  this.status = 200;
}

export function* getCollectionDesigns(this: Koa.Application.Context): AsyncIterableIterator<void> {
  const { collectionId } = this.params;

  canAccessCollectionId.call(this, collectionId);

  const collectionDesigns = yield ProductDesignsDAO.findByCollectionId(collectionId);
  const withRoles = yield Promise.all(
    collectionDesigns.map((design: ProductDesign) => attachRole(this.state.userId, design))
  );

  this.body = withRoles;
  this.status = 200;
}
