import * as Knex from 'knex';
import * as uuid from 'node-uuid';

import SketchAttribute, {
  dataAdapter,
  isSketchAttributeRow,
  SketchAttributeRow
} from './domain-objects';
import db = require('../../../services/db');
import first from '../../../services/first';
import { validate, validateEvery } from '../../../services/validate-from-db';
import SketchAttributeWithAsset, {
  dataAdapter as dataAdapterWithAsset,
  isSketchAttributeWithAssetRow,
  SketchAttributeWithAssetRow
} from './domain-objects/with-asset';

const TABLE_NAME = 'image_attributes';

/**
 * Creates a Sketch Attribute.
 */
export async function create(
  sketch: MaybeUnsaved<SketchAttribute>,
  trx: Knex.Transaction
): Promise<SketchAttribute> {
  const rowData = dataAdapter.forInsertion({
    id: uuid.v4(),
    ...sketch,
    deletedAt: null
  });
  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .modify((query: Knex.QueryBuilder) => query.transacting(trx))
    .then((rows: SketchAttributeRow[]) => first<SketchAttributeRow>(rows));

  if (!created) {
    throw new Error('Failed to create a Sketch Attribute!');
  }

  return validate<SketchAttributeRow, SketchAttribute>(
    TABLE_NAME,
    isSketchAttributeRow,
    dataAdapter,
    created
  );
}

/**
 * Returns an attribute with a matching id.
 */
export async function findById(
  sketchId: string,
  trx?: Knex.Transaction
): Promise<SketchAttribute | null> {
  const sketch: SketchAttributeRow | undefined = await db(TABLE_NAME)
    .select('*')
    .where({ deleted_at: null, id: sketchId })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: SketchAttributeRow[]) => first(rows));

  if (!sketch) {
    return null;
  }

  return validate<SketchAttributeRow, SketchAttribute>(
    TABLE_NAME,
    isSketchAttributeRow,
    dataAdapter,
    sketch
  );
}

/**
 * Find all sketch attributes by a list of node ids.
 */
export async function findAllByNodes(
  nodeIds: string[],
  trx?: Knex.Transaction
): Promise<SketchAttributeWithAsset[]> {
  const sketches: SketchAttributeWithAssetRow[] = await db(TABLE_NAME)
    .select('image_attributes.*', db.raw('row_to_json(assets.*) as asset'))
    .leftJoin('assets', 'assets.id', 'image_attributes.asset_id')
    .whereIn('image_attributes.node_id', nodeIds)
    .andWhere({ 'image_attributes.deleted_at': null })
    .orderBy('image_attributes.created_at', 'DESC')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  return validateEvery<SketchAttributeWithAssetRow, SketchAttributeWithAsset>(
    TABLE_NAME,
    isSketchAttributeWithAssetRow,
    dataAdapterWithAsset,
    sketches
  );
}
