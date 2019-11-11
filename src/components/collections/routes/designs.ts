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

export function* putDesigns(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
  const { collectionId } = this.params;
  const { designIds } = this.query;

  if (!designIds) {
    return this.throw(400, 'designIds is a required query parameter.');
  }

  const designIdList = designIds.split(',');

  if (designIdList.length === 0) {
    return this.throw(400, 'designIds must have at least one design.');
  }

  try {
    yield db.transaction(async (trx: Knex.Transaction) => {
      await moveDesigns({ collectionId, designIds: designIdList, trx });
    });

    this.body = yield ProductDesignsDAO.findByCollectionId(collectionId);
    this.status = 200;
  } catch (error) {
    return this.throw(500, error.message);
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

export function* deleteDesigns(
  this: Koa.Application.Context
): AsyncIterableIterator<void> {
  const { collectionId } = this.params;
  const { designIds } = this.query;

  if (!designIds) {
    return this.throw(400, 'designIds is a required query parameter.');
  }

  const designIdList = designIds.split(',');

  if (designIdList.length === 0) {
    return this.throw(400, 'designIds must have at least one design.');
  }

  yield db.transaction(async (trx: Knex.Transaction) => {
    await removeDesigns({ collectionId, designIds: designIdList, trx });
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

  const designsWithPermissions: DesignWithPermissions[] = [];

  for (const collectionDesign of collectionDesigns) {
    const permissions = yield getDesignPermissionsAndRole({
      designId: collectionDesign.id,
      sessionRole: role,
      sessionUserId: userId
    });
    designsWithPermissions.push({ ...collectionDesign, ...permissions });
  }

  this.body = designsWithPermissions;
  this.status = 200;
}
