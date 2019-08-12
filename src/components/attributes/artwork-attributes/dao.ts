import * as Knex from 'knex';
import * as uuid from 'node-uuid';

import ArtworkAttribute, {
  ArtworkAttributeRow,
  dataAdapter,
  isArtworkAttributeRow
} from './domain-objects';
import db = require('../../../services/db');
import first from '../../../services/first';
import { validate, validateEvery } from '../../../services/validate-from-db';
import ArtworkAttributeWithAsset, {
  ArtworkAttributeWithAssetRow,
  dataAdapter as dataAdapterWithAsset,
  isArtworkAttributeWithAssetRow
} from './domain-objects/with-asset';

const TABLE_NAME = 'artwork_attributes';

/**
 * Creates an Artwork Attribute.
 */
export async function create(
  artwork: MaybeUnsaved<ArtworkAttribute>,
  trx: Knex.Transaction
): Promise<ArtworkAttribute> {
  const rowData = dataAdapter.forInsertion({
    id: uuid.v4(),
    ...artwork,
    deletedAt: null
  });
  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .modify((query: Knex.QueryBuilder) => query.transacting(trx))
    .then((rows: ArtworkAttributeRow[]) => first<ArtworkAttributeRow>(rows));

  if (!created) {
    throw new Error('Failed to create an Artwork Attribute!');
  }

  return validate<ArtworkAttributeRow, ArtworkAttribute>(
    TABLE_NAME,
    isArtworkAttributeRow,
    dataAdapter,
    created
  );
}

/**
 * Returns an attribute with a matching id.
 */
export async function findById(
  artworkId: string,
  trx?: Knex.Transaction
): Promise<ArtworkAttribute | null> {
  const artwork: ArtworkAttributeRow | undefined = await db(TABLE_NAME)
    .select('*')
    .where({ deleted_at: null, id: artworkId })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: ArtworkAttributeRow[]) => first(rows));

  if (!artwork) {
    return null;
  }

  return validate<ArtworkAttributeRow, ArtworkAttribute>(
    TABLE_NAME,
    isArtworkAttributeRow,
    dataAdapter,
    artwork
  );
}

/**
 * Find all artwork attributes by a list of node ids.
 */
export async function findAllByNodes(
  nodeIds: string[],
  trx?: Knex.Transaction
): Promise<ArtworkAttributeWithAsset[]> {
  const artworks: ArtworkAttributeWithAssetRow[] = await db(TABLE_NAME)
    .select('artwork_attributes.*', db.raw('row_to_json(assets.*) as asset'))
    .leftJoin('assets', 'assets.id', 'artwork_attributes.asset_id')
    .whereIn('artwork_attributes.node_id', nodeIds)
    .andWhere({ 'artwork_attributes.deleted_at': null })
    .orderBy('artwork_attributes.created_at', 'DESC')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  return validateEvery<ArtworkAttributeWithAssetRow, ArtworkAttributeWithAsset>(
    TABLE_NAME,
    isArtworkAttributeWithAssetRow,
    dataAdapterWithAsset,
    artworks
  );
}
