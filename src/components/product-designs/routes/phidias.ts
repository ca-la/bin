import { isRawDesignData } from '@cala/ts-lib';
import * as Knex from 'knex';
import * as Koa from 'koa';

import { updateOrCreate as updateOrCreateNode } from '../../nodes/dao';
import { updateOrCreate as updateOrCreateAsset } from '../../assets/dao';
import { updateOrCreate as updateOrCreateDimension } from '../../attributes/dimension-attributes/dao';
import * as db from '../../../services/db';
import toDateOrNull from '../../../services/to-date';

function* updateAllNodes(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
  const { body: design } = this.request;
  const { designId } = this.params;

  if (!design) {
    return this.throw(400, 'A design body is missing!');
  }

  if (!isRawDesignData(design)) {
    return this.throw(400, 'Design body does not match nodes type!');
  }

  const updated = yield db.transaction(async (trx: Knex.Transaction) => {
    const { nodes, assets, attributes } = design;
    const newNodes = [];
    const newDimensions = [];
    const newAssets = [];

    for (const node of nodes) {
      const updateableNode = {
        ...node,
        createdAt: new Date(node.createdAt),
        deletedAt: toDateOrNull(node.deletedAt),
        type: null
      };
      const newNode = await updateOrCreateNode(designId, updateableNode, trx);
      newNodes.push(newNode);
    }

    for (const dimension of attributes.dimensions) {
      const updateableDimension = {
        ...dimension,
        createdAt: new Date(dimension.createdAt),
        deletedAt: toDateOrNull(dimension.deletedAt)
      };
      const newDimension = await updateOrCreateDimension(
        updateableDimension,
        trx
      );
      newDimensions.push(newDimension);
    }

    for (const asset of assets) {
      const updateableAsset = {
        ...asset,
        createdAt: new Date(asset.createdAt),
        uploadCompletedAt: toDateOrNull(asset.uploadCompletedAt)
      };
      const newAsset = await updateOrCreateAsset(updateableAsset, trx);
      newAssets.push(newAsset);
    }

    return {
      assets: newAssets,
      attributes: {
        ...attributes,
        dimensions: newDimensions
      },
      nodes: newNodes
    };
  });

  this.body = updated;
  this.status = 200;
}

module.exports = {
  updateAllNodes
};
