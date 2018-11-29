import * as Koa from 'koa';

import {
  canAccessCollectionId,
  canModifyCollectionId
} from '../../middleware/can-access-collection';
import canAccessUserResource = require('../../middleware/can-access-user-resource');
import * as ProductDesignsDAO from '../../dao/product-designs';
import * as CollectionsDAO from '../../dao/collections';
import ProductDesign = require('../../domain-objects/product-design');
import { getDesignPermissionsAndRole, PermissionsAndRole } from '../../services/get-permissions';

type DesignWithPermissions = ProductDesign & PermissionsAndRole;

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

export function* getCollectionDesigns(
  this: Koa.Application.Context
): AsyncIterableIterator<DesignWithPermissions[]> {
  const { collectionId } = this.params;
  const { role, userId } = this.state;

  canAccessCollectionId.call(this, collectionId);

  const collectionDesigns = yield ProductDesignsDAO.findByCollectionId(collectionId);
  const withRoles = yield Promise.all(
    collectionDesigns.map(async (design: ProductDesign): Promise<DesignWithPermissions> => {
      // TODO: switch to `getDesignPermissions` once studio consumes the `permissions` object.
      const permissions = await getDesignPermissionsAndRole(design, role, userId);
      return { ...design, ...permissions };
    })
  );

  this.body = withRoles;
  this.status = 200;
}
