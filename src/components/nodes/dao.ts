import * as Knex from 'knex';
import * as uuid from 'node-uuid';

import Node, { dataAdapter, isNodeRow, NodeRow } from './domain-objects';
import * as db from '../../services/db';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';
import { DesignRootNodeRow } from './domain-objects/design-root';

const NODES_TABLE = 'nodes';
const ROOT_NODES_TABLE = 'design_root_nodes';

/**
 * Creates a Node.
 */
export async function create(
  node: MaybeUnsaved<Node>,
  trx: Knex.Transaction
): Promise<Node> {
  const rowData = dataAdapter.forInsertion({
    id: uuid.v4(),
    ...node,
    deletedAt: null
  });
  const created = await db(NODES_TABLE)
    .insert(rowData, '*')
    .modify((query: Knex.QueryBuilder) => query.transacting(trx))
    .then((rows: NodeRow[]) => first<NodeRow>(rows));

  if (!created) {
    throw new Error('Failed to create a Node!');
  }

  return validate<NodeRow, Node>(NODES_TABLE, isNodeRow, dataAdapter, created);
}

/**
 * Creates a DesignRootNode.
 */
export async function createDesignRoot(
  data: MaybeUnsaved<Node>,
  designId: string,
  trx: Knex.Transaction
): Promise<Node> {
  const node = await create(data, trx);

  const rootNode = await db(ROOT_NODES_TABLE)
    .insert(
      {
        design_id: designId,
        id: uuid.v4(),
        node_id: node.id
      },
      '*'
    )
    .modify((query: Knex.QueryBuilder) => query.transacting(trx))
    .then((rows: DesignRootNodeRow[]) => first<DesignRootNodeRow>(rows));

  if (!rootNode) {
    throw new Error('Failed to create a root node!');
  }

  return node;
}

/**
 * Returns a node with a matching id.
 */
export async function findById(
  nodeId: string,
  trx?: Knex.Transaction
): Promise<Node | null> {
  const node: NodeRow | undefined = await db(NODES_TABLE)
    .select('*')
    .where({ deleted_at: null, id: nodeId })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: NodeRow[]) => first(rows));

  if (!node) {
    return null;
  }

  return validate<NodeRow, Node>(NODES_TABLE, isNodeRow, dataAdapter, node);
}

/**
 * Returns all the top-level nodes associated with a particular design.
 */
export async function findRootNodesByDesign(
  designId: string,
  trx?: Knex.Transaction
): Promise<Node[]> {
  const nodes: NodeRow[] = await db(NODES_TABLE)
    .select('nodes.*')
    .from('nodes')
    .leftJoin('design_root_nodes', 'design_root_nodes.node_id', 'nodes.id')
    .where({
      'design_root_nodes.design_id': designId,
      'nodes.deleted_at': null
    })
    .orderBy('nodes.ordering', 'ASC')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  return validateEvery<NodeRow, Node>(
    NODES_TABLE,
    isNodeRow,
    dataAdapter,
    nodes
  );
}

/**
 * Returns all nodes in a flat list (ordered by parent and ordering)
 * that are associated to the supplied node ids via the
 * parent_id relationship.
 */
export async function findNodeTrees(
  nodeIds: string[],
  trx?: Knex.Transaction
): Promise<Node[]> {
  const query = `
WITH RECURSIVE nodes_tree AS (
  SELECT nodes.* FROM nodes WHERE id = ANY(?)

  UNION ALL

  SELECT nodes.*
  FROM nodes, nodes_tree
  WHERE nodes.parent_id = nodes_tree.id
) SELECT DISTINCT * FROM nodes_tree ORDER BY parent_id ASC NULLS FIRST, ordering ASC;
  `;

  const result = trx
    ? await trx.raw(query, [nodeIds])
    : await db.raw(query, [nodeIds]);

  return validateEvery<NodeRow, Node>(
    NODES_TABLE,
    isNodeRow,
    dataAdapter,
    result.rows
  );
}
