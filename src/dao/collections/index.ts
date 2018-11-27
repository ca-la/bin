import * as rethrow from 'pg-rethrow';
import { pick } from 'lodash';

import Collection, {
  CollectionRow,
  dataAdapter,
  INSERTABLE_PROPERTIES,
  isCollectionRow,
  partialDataAdapter,
  UPDATABLE_PROPERTIES
} from '../../domain-objects/collection';
import { CollectionDesignRow } from '../../domain-objects/collection-design';
import CollectionSubmissionStatus, {
  CollectionSubmissionStatusRow,
  dataAdapter as collectionSubmissionStatusAdapter
} from '../../domain-objects/collection-submission-status';
import ProductDesign = require('../../domain-objects/product-design');
import * as ProductDesignsDAO from '../product-designs';

import * as db from '../../services/db';
import { validate, validateEvery } from '../../services/validate-from-db';
import first from '../../services/first';

const TABLE_NAME = 'collections';

export async function create(data: Collection): Promise<Collection> {
  const rowData = pick(dataAdapter.forInsertion(data), INSERTABLE_PROPERTIES);

  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .then((rows: CollectionRow[]) => first<CollectionRow>(rows))
    .catch(rethrow);

  if (!created) { throw new Error('Failed to create a collection'); }

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

  if (!deleted) { throw new Error(`Failed to delete collection ${id}`); }

  return validate<CollectionRow, Collection>(
    TABLE_NAME,
    isCollectionRow,
    dataAdapter,
    deleted
  );
}

export async function update(id: string, data: Partial<Collection>): Promise<Collection> {
  const rowData = pick(partialDataAdapter.forInsertion(data), UPDATABLE_PROPERTIES);
  const updated = await db(TABLE_NAME)
    .where({ deleted_at: null, id })
    .update(rowData, '*')
    .then((rows: CollectionRow[]) => first<CollectionRow>(rows))
    .catch(rethrow);

  if (!updated) { throw new Error(`Failed to update collection ${id}`); }

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

export async function findByCollaboratorUserId(userId: string): Promise<Collection[]> {
  const collections: CollectionRow[] = await db(TABLE_NAME)
    .select('collections.*')
    .from(TABLE_NAME)
    .join('collaborators', 'collaborators.collection_id', 'collections.id')
    .where({ 'collaborators.user_id': userId, 'collections.deleted_at': null })
    .orderBy('collections.created_at', 'desc')
    .catch(rethrow);

  return validateEvery<CollectionRow, Collection>(
    TABLE_NAME,
    isCollectionRow,
    dataAdapter,
    collections
  );
}

export async function findById(id: string): Promise<Collection | null> {
  const collection = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .then((rows: CollectionRow[]) => first<CollectionRow>(rows))
    .catch(rethrow);

  if (!collection) { return null; }

  return validate<CollectionRow, Collection>(
    TABLE_NAME,
    isCollectionRow,
    dataAdapter,
    collection
  );
}

export async function findByDesign(designId: string): Promise<Collection[]> {
  const collectionDesigns: CollectionDesignRow[] = await db('collection_designs')
    .where({ design_id: designId });
  const maybeCollections = await Promise.all(
    collectionDesigns.map((collectionDesign: CollectionDesignRow): Promise<Collection | null> =>
      findById(collectionDesign.collection_id)
    )
  );
  const collections = maybeCollections.filter((maybeCollection: Collection | null): boolean => {
    return maybeCollection !== null;
  }) as Collection[];

  return collections;
}

export async function addDesign(collectionId: string, designId: string): Promise<ProductDesign[]> {
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

export async function getStatusById(collectionId: string): Promise<CollectionSubmissionStatus> {
  const submissionStatus = await db.raw(`
SELECT
    c.id AS collection_id,
    (count(de_submitted.id) = count(d.id)) AS is_submitted,
    (count(de_costed.id) = count(d.id)) AS is_costed,
    (count(de_quoted.id) = count(d.id)) AS is_quoted,
    (count(de_paired.id) = count(d.id)) AS is_paired
  FROM collections AS c

  LEFT JOIN collection_designs AS cd ON cd.collection_id = c.id
  LEFT JOIN product_designs AS d ON cd.design_id = d.id

  LEFT JOIN design_events AS de_submitted
    ON cd.design_id = de_submitted.design_id
   AND de_submitted.type = 'SUBMIT_DESIGN'

  LEFT JOIN design_events AS de_costed
    ON cd.design_id = de_costed.design_id
   AND de_costed.type = 'COMMIT_COST_INPUTS'

  LEFT JOIN design_events AS de_quoted
    ON cd.design_id = de_quoted.design_id
   AND de_quoted.type = 'COMMIT_QUOTE'

  LEFT JOIN design_events AS de_paired
    ON cd.design_id = de_paired.design_id
   AND de_paired.type = 'COMMIT_PARTNER_PAIRING'

 WHERE c.id = ? AND c.deleted_at IS NULL
 GROUP BY c.id;
`, [collectionId])
    .then((rawResult: any): CollectionSubmissionStatusRow[] => rawResult.rows)
    .then((rows: CollectionSubmissionStatusRow[]) => first<CollectionSubmissionStatusRow>(rows));

  if (!submissionStatus) { throw new Error(`Cannot find status of collection ${collectionId}`); }

  return collectionSubmissionStatusAdapter.parse(submissionStatus);
}
