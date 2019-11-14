import Knex from 'knex';
import { NodeTree } from '@cala/ts-lib/dist/phidias';

import { create, createDesignRoot, findById } from '../../components/nodes/dao';
import Node from '../../components/nodes/domain-objects';

import prepareForDuplication from './prepare-for-duplication';
import findAndDuplicateAttributesForNode from './attributes/node-attributes';

/**
 * Finds the given node and duplicates it. Does the same with all related nodes and attributes.
 * Duplication Tree:
 * Node --> DesignRootNodes
 *      --> NodeAttributes
 *      --> Nodes (all descendants)
 * Assumptions:
 * - The supplied NodeTree contains no cycles.
 */
export async function findAndDuplicateNode(options: {
  isRoot: boolean;
  newCreatorId: string;
  newDesignId?: string;
  newParentId?: string;
  nodeId: string;
  tree: NodeTree;
  trx: Knex.Transaction;
}): Promise<Node> {
  const {
    isRoot,
    newCreatorId,
    newDesignId,
    newParentId,
    nodeId,
    tree,
    trx
  } = options;

  const node = await findById(nodeId, trx);
  const childNodeIds = tree[nodeId] || [];

  if (!node) {
    throw new Error(`Node ${nodeId} not found.`);
  }

  if (isRoot && !newDesignId) {
    throw new Error(
      'Cannot duplicate a root node without a design id specified.'
    );
  }

  // Duplicate the node.
  const preparedNode = prepareForDuplication(node, {
    createdBy: newCreatorId,
    parentId: newParentId || node.parentId
  });
  const duplicateNode =
    isRoot && newDesignId
      ? await createDesignRoot(preparedNode, newDesignId, trx)
      : await create(preparedNode, trx);

  // Duplicate all associated attributes.
  await findAndDuplicateAttributesForNode({
    currentNodeId: node.id,
    newCreatorId,
    newNodeId: duplicateNode.id,
    trx
  });

  // Duplicate all children of the current node recursively.
  for (const childNodeId of childNodeIds) {
    await findAndDuplicateNode({
      isRoot: false,
      newCreatorId,
      newParentId: duplicateNode.id,
      nodeId: childNodeId,
      tree,
      trx
    });
  }

  return duplicateNode;
}
