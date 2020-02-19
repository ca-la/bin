import Knex from 'knex';
import rethrow from 'pg-rethrow';
import uuid from 'node-uuid';

import { validate, validateEvery } from '../../services/validate-from-db';
import Asset, {
  AssetRow,
  dataAdapter,
  isAssetRow,
  toInsertion,
  toPartialInsertion
} from './domain-object';
import db from '../../services/db';
import first from '../../services/first';

const TABLE_NAME = 'assets';

export async function create(
  asset: Asset | MaybeUnsaved<Asset>,
  trx?: Knex.Transaction
): Promise<Asset> {
  const row = toInsertion({
    id: uuid.v4(),
    createdAt: new Date(),
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

export async function createAll(
  trx: Knex.Transaction,
  assets: Asset[]
): Promise<Asset[]> {
  const rows = assets.map((asset: Asset) => dataAdapter.forInsertion(asset));

  const created = await trx(TABLE_NAME).insert(rows, '*');

  return validateEvery<AssetRow, Asset>(
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
  fileData: Partial<Asset>,
  trx?: Knex.Transaction
): Promise<Asset> {
  const row = toPartialInsertion(fileData);

  const updated = await db(TABLE_NAME)
    .where({ id })
    .update(row, '*')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
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

export async function updateOrCreate(
  data: Asset,
  trx: Knex.Transaction
): Promise<Asset> {
  const existingAsset = await findById(data.id);
  if (existingAsset) {
    return update(data.id, data, trx);
  }
  return create(data, trx);
}
