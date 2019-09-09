import { isRawDesignData } from '@cala/ts-lib';
import * as Knex from 'knex';
import * as Koa from 'koa';

import { updateOrCreate as updateOrCreateNode } from '../../nodes/dao';
import { updateOrCreate as updateOrCreateAsset } from '../../assets/dao';
import * as db from '../../../services/db';
import toDateOrNull from '../../../services/to-date';

function* updateAllNodes(
  this: Koa.Application.Context
): AsyncIterableIterator<any> {
  const design = this.request.body;

  if (!design) {
    return this.throw(400, 'A design body is missing!');
  }

  if (!isRawDesignData(design)) {
    return this.throw(400, 'Design body does not match nodes type!');
  }

  const updated = yield db.transaction(async (trx: Knex.Transaction) => {
    const { nodes, assets, attributes } = design;
    const newNodes = [];
    const newAssets = [];

    for (const node of nodes) {
      const updateableNode = {
        ...node,
        createdAt: new Date(node.createdAt),
        deletedAt: toDateOrNull(node.deletedAt)
      };
      const newNode = await updateOrCreateNode(updateableNode, trx);
      newNodes.push(newNode);
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
      attributes,
      nodes: newNodes
    };
  });

  this.body = updated;
  this.status = 200;
}

module.exports = {
  updateAllNodes
};
