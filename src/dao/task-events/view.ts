import * as Knex from 'knex';
import * as db from '../../services/db';
import { getBuilder as getCollaboratorsBuilder } from '../../components/collaborators/view';

export const ALIASES = {
  collectionId: 'collectionsfortasksviewraw.id',
  designId: 'designsfortasksviewraw.id',
  stageId: 'stagesfortasksviewraw.id',
  taskId: 'tasksfortasksviewraw.id'
};

export function getBuilder(): Knex.QueryBuilder {
  return db.select(
    'tasksfortasksviewraw.id as id',
    'tasksfortasksviewraw.created_at as created_at',
    'taskeventsfortasksviewraw.created_by as created_by',
    'taskeventsfortasksviewraw.title as title',
    'taskeventsfortasksviewraw.description as description',
    'taskeventsfortasksviewraw.ordering as ordering',
    'taskeventsfortasksviewraw.status as status',
    'taskeventsfortasksviewraw.due_date as due_date',
    'stagesfortasksviewraw.id as design_stage_id',
    'stagesfortasksviewraw.title as design_stage_title',
    'stagesfortasksviewraw.ordering as design_stage_ordering',
    'designsfortasksviewraw.id as design_id',
    'designsfortasksviewraw.created_at as design_created_at',
    'designsfortasksviewraw.title as design_title',
    'designsfortasksviewraw.image_ids as image_ids',
    'collectionsfortasksviewraw.id as collection_id',
    'collectionsfortasksviewraw.title as collection_title',
    'collectionsfortasksviewraw.created_at as collection_created_at'
  )
  .count('commentsfortasksviewraw.id as comment_count')
  .select(db.raw(`
    (
      SELECT to_json(array[cwufortasksviewraw.*])
      FROM (:collaboratorsWithUsers) as cwufortasksviewraw
            JOIN collaborator_tasks as ctfortasksviewraw
              ON ctfortasksviewraw.collaborator_id = cwufortasksviewraw.id
            WHERE ctfortasksviewraw.task_id = tasksfortasksviewraw.id
              AND (
                cwufortasksviewraw.cancelled_at IS null
                  OR cwufortasksviewraw.cancelled_at > now()
              )
    ) as assignees
  `, { collaboratorsWithUsers: getCollaboratorsBuilder() }))
  .from('task_events as taskeventsfortasksviewraw')
  .join(
    'tasks as tasksfortasksviewraw',
    'taskeventsfortasksviewraw.task_id',
    'tasksfortasksviewraw.id')
  .leftJoin(
    'product_design_stage_tasks as designstagetasksfortasksviewraw',
    'designstagetasksfortasksviewraw.task_id',
    'tasksfortasksviewraw.id')
  .leftJoin(
    'product_design_stages as stagesfortasksviewraw',
    'designstagetasksfortasksviewraw.design_stage_id',
    'stagesfortasksviewraw.id')
  .leftJoin(
    'product_designs_with_metadata as designsfortasksviewraw',
    'designsfortasksviewraw.id',
    'stagesfortasksviewraw.design_id')
  .leftJoin(
    'collection_designs as collectiondesignsfortasksviewraw',
    'designsfortasksviewraw.id',
    'collectiondesignsfortasksviewraw.design_id')
  .leftJoin(
    'collections as collectionsfortasksviewraw',
    'collectiondesignsfortasksviewraw.collection_id',
    'collectionsfortasksviewraw.id')
  .leftJoin(
    'task_comments as taskcommentsfortasksviewraw',
    'taskcommentsfortasksviewraw.task_id',
    'tasksfortasksviewraw.id')
  .leftJoin(
    'comments as commentsfortasksviewraw',
    'taskcommentsfortasksviewraw.comment_id',
    'commentsfortasksviewraw.id')
  .where({
    'collectionsfortasksviewraw.deleted_at': null,
    'commentsfortasksviewraw.deleted_at': null,
    'designsfortasksviewraw.deleted_at': null
  })
  .andWhereRaw(`
  NOT EXISTS (
      SELECT * from task_events as taskeventsfortasksviewraw2
      WHERE taskeventsfortasksviewraw.task_id = taskeventsfortasksviewraw2.task_id
        AND taskeventsfortasksviewraw2.created_at > taskeventsfortasksviewraw.created_at
    )`)
  .groupByRaw(`(
    tasksfortasksviewraw.id,
    tasksfortasksviewraw.created_at,
    taskeventsfortasksviewraw.id,
    taskeventsfortasksviewraw.created_by,
    taskeventsfortasksviewraw.title,
    taskeventsfortasksviewraw.description,
    taskeventsfortasksviewraw.ordering,
    taskeventsfortasksviewraw.status,
    taskeventsfortasksviewraw.due_date,
    stagesfortasksviewraw.id,
    stagesfortasksviewraw.title,
    stagesfortasksviewraw.ordering,
    designsfortasksviewraw.id,
    designsfortasksviewraw.title,
    designsfortasksviewraw.created_at,
    designsfortasksviewraw.image_ids,
    collectionsfortasksviewraw.id,
    collectionsfortasksviewraw.title,
    collectionsfortasksviewraw.created_at
  )`);
}
