import { pick } from 'lodash';
import * as db from '../../services/db';
import CollectionService, {
  CollectionServiceRow,
  dataAdapter,
  isCollectionServiceRow,
  UPDATABLE_PROPERTIES
} from '../../domain-objects/collection-service';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'collection_services';

export async function create(data: Uninserted<CollectionService>): Promise<CollectionService> {
  const rowData = dataAdapter.forInsertion({
    ...data,
    deletedAt: null
  });

  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .then((rows: CollectionServiceRow[]) => first<CollectionServiceRow>(rows));

  if (!created) { throw new Error('Failed to create a collectionService'); }

  return validate<CollectionServiceRow, CollectionService>(
    TABLE_NAME,
    isCollectionServiceRow,
    dataAdapter,
    created
  );
}

export async function findById(id: string): Promise<CollectionService | null> {
  const collectionServices: CollectionServiceRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ id, deleted_at: null })
    .limit(1);

  const collectionService = collectionServices[0];

  if (!collectionService) { return null; }

  return validate<CollectionServiceRow, CollectionService>(
    TABLE_NAME,
    isCollectionServiceRow,
    dataAdapter,
    collectionService
  );
}

export async function update(id: string, data: CollectionService): Promise<CollectionService> {
  const rowData = pick(dataAdapter.forInsertion(data), UPDATABLE_PROPERTIES);
  const updated = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update(rowData, '*')
    .then((rows: CollectionServiceRow[]) => first<CollectionServiceRow>(rows));

  if (!updated) { throw new Error('Failed to update row'); }

  return validate<CollectionServiceRow, CollectionService>(
    TABLE_NAME,
    isCollectionServiceRow,
    dataAdapter,
    updated
  );
}

export async function deleteById(id: string): Promise<CollectionService> {
  const deleted = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update({ deleted_at: new Date() }, '*')
    .then((rows: CollectionServiceRow[]) => first<CollectionServiceRow>(rows));

  if (!deleted) { throw new Error('Failed to delete row'); }

  return validate<CollectionServiceRow, CollectionService>(
    TABLE_NAME,
    isCollectionServiceRow,
    dataAdapter,
    deleted
  );
}

export async function findAllByCollectionId(collectionId: string): Promise<CollectionService[]> {
  const collectionServices: CollectionServiceRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ collection_id: collectionId, deleted_at: null })
    .orderBy('created_at', 'ASC');
  return validateEvery<CollectionServiceRow, CollectionService>(
    TABLE_NAME,
    isCollectionServiceRow,
    dataAdapter,
    collectionServices
  );
}
