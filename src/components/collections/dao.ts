import * as Knex from 'knex';
import * as rethrow from 'pg-rethrow';
import { pick } from 'lodash';

import Collection, {
  CollectionRow,
  dataAdapter,
  INSERTABLE_PROPERTIES,
  isCollectionRow,
  partialDataAdapter,
  UPDATABLE_PROPERTIES
} from './domain-object';
import { CollectionDesignRow } from '../../domain-objects/collection-design';
import ProductDesign = require('../product-designs/domain-objects/product-design');
import * as ProductDesignsDAO from '../product-designs/dao';

import * as db from '../../services/db';
import { validate, validateEvery } from '../../services/validate-from-db';
import first from '../../services/first';
import limitOrOffset from '../../services/limit-or-offset';
import { ExpirationNotification } from '../notifications/models/costing-expiration';
import {
  dataAdapter as metaDataApapter,
  isMetaCollectionRow,
  MetaCollection,
  MetaCollectionRow
} from './meta-domain-object';

const TABLE_NAME = 'collections';

export async function create(data: Collection): Promise<Collection> {
  const rowData = pick(dataAdapter.forInsertion(data), INSERTABLE_PROPERTIES);

  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .then((rows: CollectionRow[]) => first<CollectionRow>(rows))
    .catch(rethrow);

  if (!created) {
    throw new Error('Failed to create a collection');
  }

  return validate<CollectionRow, Collection>(
    TABLE_NAME,
    isCollectionRow,
    dataAdapter,
    created
  );
}

export async function deleteById(id: string): Promise<Collection> {
  const deleted = await db(TABLE_NAME)
    .where({ deleted_at: null, id })
    .update({ deleted_at: new Date() }, '*')
    .then((rows: CollectionRow[]) => first<CollectionRow>(rows));

  if (!deleted) {
    throw new Error(`Failed to delete collection ${id}`);
  }

  return validate<CollectionRow, Collection>(
    TABLE_NAME,
    isCollectionRow,
    dataAdapter,
    deleted
  );
}

export async function update(
  id: string,
  data: Partial<Collection>
): Promise<Collection> {
  const rowData = pick(
    partialDataAdapter.forInsertion(data),
    UPDATABLE_PROPERTIES
  );
  const updated = await db(TABLE_NAME)
    .where({ deleted_at: null, id })
    .update(rowData, '*')
    .then((rows: CollectionRow[]) => first<CollectionRow>(rows))
    .catch(rethrow);

  if (!updated) {
    throw new Error(`Failed to update collection ${id}`);
  }

  return validate<CollectionRow, Collection>(
    TABLE_NAME,
    isCollectionRow,
    dataAdapter,
    updated
  );
}

export async function findByUserId(userId: string): Promise<Collection[]> {
  const collections: CollectionRow[] = await db(TABLE_NAME)
    .where({ created_by: userId, deleted_at: null })
    .orderBy('created_at', 'desc')
    .catch(rethrow);

  return validateEvery<CollectionRow, Collection>(
    TABLE_NAME,
    isCollectionRow,
    dataAdapter,
    collections
  );
}

export async function findByCollaboratorAndUserId(options: {
  userId: string;
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<Collection[]> {
  const collections: CollectionRow[] = await db(TABLE_NAME)
    .select('collections.*')
    .distinct('collections.id')
    .from(TABLE_NAME)
    .join('collaborators', 'collaborators.collection_id', 'collections.id')
    .modify(
      (query: Knex.QueryBuilder): void => {
        if (options.search) {
          query.where(db.raw('(collections.title ~* ?)', options.search));
        }
      }
    )
    .where({
      'collaborators.user_id': options.userId,
      'collections.deleted_at': null
    })
    .whereRaw(
      `
      ((collaborators.cancelled_at IS NULL OR collaborators.cancelled_at > now()) OR
      (collections.created_by = ? AND collections.deleted_at IS NULL))`,
      options.userId
    )
    .modify(limitOrOffset(options.limit, options.offset))
    .orderBy('collections.created_at', 'desc')
    .catch(rethrow);

  return validateEvery<CollectionRow, Collection>(
    TABLE_NAME,
    isCollectionRow,
    dataAdapter,
    collections
  );
}

export async function findById(
  id: string,
  trx?: Knex.Transaction
): Promise<Collection | null> {
  const collection = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .then((rows: CollectionRow[]) => first<CollectionRow>(rows))
    .catch(rethrow);

  if (!collection) {
    return null;
  }

  return validate<CollectionRow, Collection>(
    TABLE_NAME,
    isCollectionRow,
    dataAdapter,
    collection
  );
}

export async function findByDesign(
  designId: string,
  trx?: Knex.Transaction
): Promise<Collection[]> {
  const collectionDesigns: CollectionDesignRow[] = await db(
    'collection_designs'
  )
    .where({ design_id: designId })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });
  const maybeCollections = await Promise.all(
    collectionDesigns.map(
      (collectionDesign: CollectionDesignRow): Promise<Collection | null> =>
        findById(collectionDesign.collection_id, trx)
    )
  );
  const collections = maybeCollections.filter(
    (maybeCollection: Collection | null): boolean => {
      return maybeCollection !== null;
    }
  ) as Collection[];

  return collections;
}

/**
 * Finds all submitted but unpaid for collections
 */
export async function findSubmittedButUnpaidCollections(): Promise<
  Collection[]
> {
  const collections: CollectionRow[] = await db(TABLE_NAME)
    .select('collections.*')
    .distinct('collections.id')
    .from(TABLE_NAME)
    .joinRaw(
      `
JOIN collection_designs as cd
  ON cd.collection_id = collections.id
    `
    )
    .joinRaw(
      `
JOIN (
  SELECT *
  FROM design_events AS de1
  JOIN product_designs as d
    ON d.id = de1.design_id
  WHERE type='SUBMIT_DESIGN'
    AND d.deleted_at is null
    AND NOT EXISTS (
    SELECT * from design_events AS de2
    WHERE de1.design_id = de2.design_id
      AND de2.type = 'COMMIT_QUOTE')
) AS de
  ON de.design_id = cd.design_id
    `
    )
    .where({ 'collections.deleted_at': null })
    .orderBy('collections.id');

  return validateEvery<CollectionRow, Collection>(
    TABLE_NAME,
    isCollectionRow,
    dataAdapter,
    collections
  );
}

export async function addDesign(
  collectionId: string,
  designId: string
): Promise<ProductDesign[]> {
  await db('collection_designs')
    .insert({ collection_id: collectionId, design_id: designId }, '*')
    .catch(rethrow);
  return ProductDesignsDAO.findByCollectionId(collectionId);
}

export async function moveDesign(
  collectionId: string,
  designId: string
): Promise<ProductDesign[]> {
  await db('collection_designs')
    .where({ design_id: designId })
    .del()
    .then(() => addDesign(collectionId, designId))
    .catch(rethrow);
  return ProductDesignsDAO.findByCollectionId(collectionId);
}

export async function removeDesign(
  collectionId: string,
  designId: string
): Promise<ProductDesign[]> {
  await db('collection_designs')
    .where({ collection_id: collectionId, design_id: designId })
    .del()
    .catch(rethrow);
  return ProductDesignsDAO.findByCollectionId(collectionId);
}

/**
 * Finds all collections that are:
 * - have cost inputs that are going to expire within the supplied time bound
 * - do not have a notification sent of the given type
 * - not deleted
 */
export async function findAllUnnotifiedCollectionsWithExpiringCostInputs(options: {
  time: Date;
  boundingHours: number;
  notificationType: ExpirationNotification;
  trx: Knex.Transaction;
}): Promise<MetaCollection[]> {
  const { boundingHours, notificationType, time, trx } = options;

  const lowerBound = new Date(time);
  lowerBound.setHours(time.getHours() - boundingHours);
  const upperBound = new Date(time);
  upperBound.setHours(time.getHours() + boundingHours);

  const rows: MetaCollectionRow[] = await db(TABLE_NAME)
    .distinct('collections.id AS id')
    .select('collections.created_by AS created_by')
    .from('pricing_cost_inputs AS pci')
    .leftJoin(
      'collection_designs',
      'collection_designs.design_id',
      'pci.design_id'
    )
    .leftJoin(
      'collections',
      'collections.id',
      'collection_designs.collection_id'
    )
    .leftJoin('notifications', 'notifications.collection_id', 'collections.id')
    .where({
      'pci.deleted_at': null
    })
    .whereBetween('pci.expires_at', [lowerBound, upperBound])
    .whereNotIn(
      'collections.id',
      trx
        .distinct('c2.id')
        .from('collections AS c2')
        .leftJoin('notifications', 'notifications.collection_id', 'c2.id')
        .where({ 'notifications.type': notificationType })
    )
    .transacting(trx);

  return validateEvery<MetaCollectionRow, MetaCollection>(
    TABLE_NAME,
    isMetaCollectionRow,
    metaDataApapter,
    rows
  );
}
