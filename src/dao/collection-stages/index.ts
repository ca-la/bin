import * as uuid from 'node-uuid';

import * as db from '../../services/db';
import CollectionStage, {
  CollectionStageRow,
  dataAdapter,
  isCollectionStageRow
} from '../../domain-objects/collection-stage';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'collection_stages';

export async function create(data: Unsaved<CollectionStage>): Promise<CollectionStage> {
  const rowData = dataAdapter.forInsertion({
    ...data,
    id: uuid.v4()
  });
  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .then((rows: CollectionStageRow[]) => first<CollectionStageRow>(rows));

  if (!created) { throw new Error('Failed to create rows'); }

  return validate<CollectionStageRow, CollectionStage>(
    TABLE_NAME,
    isCollectionStageRow,
    dataAdapter,
    created
  );
}

export async function findById(id: string): Promise<CollectionStage> {
  const collectionStage: CollectionStageRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ id })
    .orderBy('created_at', 'desc')
    .limit(1);

  return validate<CollectionStageRow, CollectionStage>(
    TABLE_NAME,
    isCollectionStageRow,
    dataAdapter,
    collectionStage[0]
  );
}

export async function findAllByCollectionId(collectionId: string): Promise<CollectionStage[]> {
  const collectionStages: CollectionStageRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ collection_id: collectionId })
    .orderBy('created_at', 'desc');

  return validateEvery<CollectionStageRow, CollectionStage>(
    TABLE_NAME,
    isCollectionStageRow,
    dataAdapter,
    collectionStages
  );
}
