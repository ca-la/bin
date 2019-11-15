import { isRawDesignData } from '@cala/ts-lib';
import Knex from 'knex';

import { updateOrCreate as updateOrCreateNode } from '../../nodes/dao';
import { updateOrCreate as updateOrCreateAsset } from '../../assets/dao';
import { updateOrCreate as updateOrCreateLayout } from '../../attributes/layout-attributes/dao';
import db from '../../../services/db';
import toDateOrNull from '../../../services/to-date';

export function* updateAllNodes(this: AuthedContext): Iterator<any, any, any> {
  const { body: design } = this.request;
  const { designId } = this.params;

  if (!design) {
    this.throw(400, 'A design body is missing!');
  }

  if (!isRawDesignData(design)) {
    this.throw(400, 'Design body does not match nodes type!');
  }

  const updated = yield db.transaction(async (trx: Knex.Transaction) => {
    const { nodes, assets, attributes } = design;
    const newNodes = [];
    const newLayouts = [];
    const newAssets = [];

    for (const node of nodes) {
      const updateableNode = {
        ...node,
        createdAt: new Date(node.createdAt || new Date()),
        deletedAt: toDateOrNull(node.deletedAt),
        type: null
      };
      const newNode = await updateOrCreateNode(designId, updateableNode, trx);
      newNodes.push(newNode);
    }

    for (const layout of attributes.dimensions) {
      const updateableLayout = {
        ...layout,
        createdAt: new Date(layout.createdAt),
        deletedAt: toDateOrNull(layout.deletedAt)
      };
      const newLayout = await updateOrCreateLayout(updateableLayout, trx);
      newLayouts.push(newLayout);
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
        dimensions: newLayouts
      },
      nodes: newNodes
    };
  });

  this.body = updated;
  this.status = 200;
}
