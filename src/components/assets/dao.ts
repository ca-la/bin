import * as Knex from 'knex';
import * as rethrow from 'pg-rethrow';
import * as uuid from 'node-uuid';

import { validate } from '../../services/validate-from-db';
import Asset, {
  AssetRow,
  dataAdapter,
  isAssetRow,
  toInsertion,
  toPartialInsertion
} from './domain-object';
import db = require('../../services/db');
import first from '../../services/first';

const TABLE_NAME = 'images';

export async function create(
  asset: Asset | MaybeUnsaved<Asset>,
  trx?: Knex.Transaction
): Promise<Asset> {
  const row = toInsertion({
    id: uuid.v4(),
    createdAt: new Date(),
    deletedAt: null,
    ...asset
  });

  const created = await db(TABLE_NAME)
    .insert(row)
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .returning('*')
    .then((rows: AssetRow[]) => {
      return first(rows);
    });

  if (!created) {
    throw new Error('Failed to create an Asset');
  }

  return validate<AssetRow, Asset>(
    TABLE_NAME,
    isAssetRow,
    dataAdapter,
    created
  );
}

export async function findById(assetId: string): Promise<Asset | null> {
  const found = await db(TABLE_NAME)
    .where({ id: assetId }, '*')
    .catch(rethrow)
    .then((rows: AssetRow[]) => first(rows));

  if (!found) {
    return null;
  }

  return validate<AssetRow, Asset>(TABLE_NAME, isAssetRow, dataAdapter, found);
}

export async function update(
  id: string,
  fileData: Partial<Asset>
): Promise<Asset> {
  const row = toPartialInsertion(fileData);

  const updated = await db(TABLE_NAME)
    .where({ id })
    .update(row, '*')
    .then((rows: AssetRow[]) => first<AssetRow>(rows));

  if (!updated) {
    throw new Error('There was a problem updating the Asset');
  }

  return validate<AssetRow, Asset>(
    TABLE_NAME,
    isAssetRow,
    dataAdapter,
    updated
  );
}
