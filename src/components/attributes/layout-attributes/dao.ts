import * as Knex from 'knex';
import * as uuid from 'node-uuid';

import LayoutAttribute, {
  dataAdapter,
  isLayoutAttributeRow,
  LayoutAttributeRow
} from './domain-object';
import db = require('../../../services/db');
import first from '../../../services/first';
import { validate, validateEvery } from '../../../services/validate-from-db';

const TABLE_NAME = 'layout_attributes';

/**
 * Creates an Layout Attribute.
 */
export async function create(
  layout: MaybeUnsaved<LayoutAttribute>,
  trx: Knex.Transaction
): Promise<LayoutAttribute> {
  const rowData = dataAdapter.forInsertion({
    id: uuid.v4(),
    ...layout,
    deletedAt: null
  });
  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .transacting(trx)
    .then((rows: LayoutAttributeRow[]) => first<LayoutAttributeRow>(rows));

  if (!created) {
    throw new Error('Failed to create an Layout Attribute!');
  }

  return validate<LayoutAttributeRow, LayoutAttribute>(
    TABLE_NAME,
    isLayoutAttributeRow,
    dataAdapter,
    created
  );
}

/**
 * Returns a layout attribute with a matching id.
 */
export async function findById(
  layoutId: string,
  trx?: Knex.Transaction
): Promise<LayoutAttribute | null> {
  const layout: LayoutAttributeRow | undefined = await db(TABLE_NAME)
    .select('*')
    .where({ deleted_at: null, id: layoutId })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: LayoutAttributeRow[]) => first(rows));

  if (!layout) {
    return null;
  }

  return validate<LayoutAttributeRow, LayoutAttribute>(
    TABLE_NAME,
    isLayoutAttributeRow,
    dataAdapter,
    layout
  );
}

/**
 * Find all layout attributes by a list of node ids.
 */
export async function findAllByNodes(
  nodeIds: string[],
  trx?: Knex.Transaction
): Promise<LayoutAttribute[]> {
  const layouts: LayoutAttributeRow[] = await db(TABLE_NAME)
    .select('layout_attributes.*')
    .whereIn('layout_attributes.node_id', nodeIds)
    .andWhere({ 'layout_attributes.deleted_at': null })
    .orderBy('layout_attributes.created_at', 'DESC')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  return validateEvery<LayoutAttributeRow, LayoutAttribute>(
    TABLE_NAME,
    isLayoutAttributeRow,
    dataAdapter,
    layouts
  );
}

/**
 * Update layout
 */
export async function update(
  id: string,
  layout: LayoutAttribute,
  trx: Knex.Transaction
): Promise<LayoutAttribute> {
  const rowData = dataAdapter.forInsertion(layout);
  const updated = await db(TABLE_NAME)
    .update(rowData, '*')
    .where({ id })
    .transacting(trx)
    .then((rows: LayoutAttributeRow[]) => first<LayoutAttributeRow>(rows));

  if (!updated) {
    throw new Error('Failed to create an Layout Attribute!');
  }

  return validate<LayoutAttributeRow, LayoutAttribute>(
    TABLE_NAME,
    isLayoutAttributeRow,
    dataAdapter,
    updated
  );
}

export async function updateOrCreate(
  data: LayoutAttribute,
  trx: Knex.Transaction
): Promise<LayoutAttribute> {
  const existingLayout = await findById(data.id, trx);
  if (existingLayout) {
    return update(data.id, data, trx);
  }
  return create(data, trx);
}
