import * as Koa from 'koa';
import * as Knex from 'knex';

import * as ProductDesignsDAO from '../../product-designs/dao';
import ProductDesign = require('../../product-designs/domain-objects/product-design');
import {
  getDesignPermissionsAndRole,
  PermissionsAndRole
} from '../../../services/get-permissions';
import { moveDesigns, removeDesigns } from '../dao/design';
import db = require('../../../services/db');

type DesignWithPermissions = ProductDesign & PermissionsAndRole;

export function* putDesign(
  this: Koa.Application.Context
): AsyncIterableIterator<void> {
  const { collectionId, designId } = this.params;

  try {
    yield db.transaction(async (trx: Knex.Transaction) => {
      await moveDesigns({ collectionId, designIds: [designId], trx });
    });
    this.body = yield ProductDesignsDAO.findByCollectionId(collectionId);
    this.status = 200;
  } catch (error) {
    throw error;
  }
}

export function* deleteDesign(
  this: Koa.Application.Context
): AsyncIterableIterator<void> {
  const { collectionId, designId } = this.params;
  yield db.transaction(async (trx: Knex.Transaction) => {
    await removeDesigns({ collectionId, designIds: [designId], trx });
  });
  this.body = yield ProductDesignsDAO.findByCollectionId(collectionId);
  this.status = 200;
}

export function* getCollectionDesigns(
  this: Koa.Application.Context
): AsyncIterableIterator<DesignWithPermissions[]> {
  const { collectionId } = this.params;
  const { role, userId } = this.state;

  const collectionDesigns = yield ProductDesignsDAO.findByCollectionId(
    collectionId
  );
  const withRoles = yield Promise.all(
    collectionDesigns.map(
      async (design: ProductDesign): Promise<DesignWithPermissions> => {
        // TODO: switch to `getDesignPermissions` once studio consumes the `permissions` object.
        const permissions = await getDesignPermissionsAndRole(
          design,
          role,
          userId
        );
        return { ...design, ...permissions };
      }
    )
  );

  this.body = withRoles;
  this.status = 200;
}
