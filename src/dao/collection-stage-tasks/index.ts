import * as uuid from 'node-uuid';

import * as db from '../../services/db';
import CollectionStageTask, {
  CollectionStageTaskRow,
  dataAdapter,
  isCollectionStageTaskRow
} from '../../domain-objects/collection-stage-task';
import first from '../../services/first';
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'collection_stage_tasks';

export async function create(data: Unsaved<CollectionStageTask>): Promise<CollectionStageTask> {
  const rowData = dataAdapter.forInsertion({
    ...data,
    id: uuid.v4()
  });
  const created = await db(TABLE_NAME)
    .insert(rowData, '*')
    .then((rows: CollectionStageTaskRow[]) => first<CollectionStageTaskRow>(rows));

  if (!created) { throw new Error('Failed to create rows'); }

  return validate<CollectionStageTaskRow, CollectionStageTask>(
    TABLE_NAME,
    isCollectionStageTaskRow,
    dataAdapter,
    created
  );
}

export async function findById(id: string): Promise<CollectionStageTask> {
  const collectionStageTask: CollectionStageTaskRow[] = await db(TABLE_NAME)
    .select('*')
    .where({ id })
    .limit(1);

  return validate<CollectionStageTaskRow, CollectionStageTask>(
    TABLE_NAME,
    isCollectionStageTaskRow,
    dataAdapter,
    collectionStageTask[0]
  );
}

export async function findAllByCollectionId(collectionId: string): Promise<CollectionStageTask[]> {
  const collectionStageTasks: CollectionStageTaskRow[] = await db(TABLE_NAME)
    .select('collection_stage_tasks.*')
    .from(TABLE_NAME)
    .leftJoin(
      'collection_stages',
      'collection_stages.id',
      'collection_stage_tasks.collection_stage_id')
    .where({ 'collection_stages.collection_id': collectionId })
    .orderBy('created_at', 'desc');

  return validateEvery<CollectionStageTaskRow, CollectionStageTask>(
    TABLE_NAME,
    isCollectionStageTaskRow,
    dataAdapter,
    collectionStageTasks
  );
}
