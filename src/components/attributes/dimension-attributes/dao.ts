import * as Knex from 'knex';
import * as uuid from 'node-uuid';

import DimensionAttribute, {
  dataAdapter,
  DimensionAttributeRow,
  isDimensionAttributeRow
} from './domain-object';
import db = require('../../../services/db');
import first from '../../../services/first';
import { validate, validateEvery } from '../../../services/validate-from-db';

const TABLE_NAME = 'dimension_attributes';

/**
 * Creates an Dimension Attribute.
 */
export async function create(
  dimension: MaybeUnsaved<DimensionAttribute>,
  trx: Knex.Transaction
): Promise<DimensionAttribute> {
  const rowData = dataAdapter.forInsertion({
    id: uuid.v4(),
    ...dimension,
    deletedAt: null
  });
  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .modify((query: Knex.QueryBuilder) => query.transacting(trx))
    .then((rows: DimensionAttributeRow[]) =>
      first<DimensionAttributeRow>(rows)
    );

  if (!created) {
    throw new Error('Failed to create an Dimension Attribute!');
  }

  return validate<DimensionAttributeRow, DimensionAttribute>(
    TABLE_NAME,
    isDimensionAttributeRow,
    dataAdapter,
    created
  );
}

/**
 * Returns a dimension attribute with a matching id.
 */
export async function findById(
  dimensionId: string,
  trx?: Knex.Transaction
): Promise<DimensionAttribute | null> {
  const dimension: DimensionAttributeRow | undefined = await db(TABLE_NAME)
    .select('*')
    .where({ deleted_at: null, id: dimensionId })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: DimensionAttributeRow[]) => first(rows));

  if (!dimension) {
    return null;
  }

  return validate<DimensionAttributeRow, DimensionAttribute>(
    TABLE_NAME,
    isDimensionAttributeRow,
    dataAdapter,
    dimension
  );
}

/**
 * Find all dimension attributes by a list of node ids.
 */
export async function findAllByNodes(
  nodeIds: string[],
  trx?: Knex.Transaction
): Promise<DimensionAttribute[]> {
  const dimensions: DimensionAttributeRow[] = await db(TABLE_NAME)
    .select('dimension_attributes.*')
    .whereIn('dimension_attributes.node_id', nodeIds)
    .andWhere({ 'dimension_attributes.deleted_at': null })
    .orderBy('dimension_attributes.created_at', 'DESC')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  return validateEvery<DimensionAttributeRow, DimensionAttribute>(
    TABLE_NAME,
    isDimensionAttributeRow,
    dataAdapter,
    dimensions
  );
}
