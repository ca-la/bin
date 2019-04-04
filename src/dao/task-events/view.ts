import * as db from '../../services/db';
import { VIEW_RAW as collaboratorsWithUsers } from '../../components/collaborators/view';

export const VIEW_RAW = db.raw(`
SELECT tasksForTasksViewRaw.id as id,
  tasksForTasksViewRaw.created_at as created_at,
  taskEventsForTasksViewRaw.created_by as created_by,
  taskEventsForTasksViewRaw.title as title,
  taskEventsForTasksViewRaw.description as description,
  taskEventsForTasksViewRaw.ordering as ordering,
  taskEventsForTasksViewRaw.status as status,
  taskEventsForTasksViewRaw.due_date as due_date,
  sForTasksViewRaw.id as design_stage_id,
  sForTasksViewRaw.title as design_stage_title,
  sForTasksViewRaw.ordering as design_stage_ordering,
  designsForTasksViewRaw.id as design_id,
  designsForTasksViewRaw.title as design_title,
  designsForTasksViewRaw.created_at as design_created_at,
  collectionsForTasksViewRaw.id as collection_id,
  collectionsForTasksViewRaw.title as collection_title,
  collectionsForTasksViewRaw.created_at as collection_created_at,

  (
    SELECT COUNT(*)
    FROM task_comments as taskCommentsForTasksViewRaw
    JOIN comments as commentsForTasksViewRaw
      ON taskCommentsForTasksViewRaw.comment_id = commentsForTasksViewRaw.id
    WHERE taskCommentsForTasksViewRaw.task_id = tasksForTasksViewRaw.id
      AND commentsForTasksViewRaw.deleted_at IS NULL
  ) as comment_count,

  (
    SELECT array_remove(array_agg(pdiForTasksViewRaw.id), null) AS image_ids
    FROM product_designs AS innerDesignsForTasksViewRaw
    LEFT JOIN (
      SELECT *
      FROM product_design_canvases AS pdcForTasksViewRaw
      WHERE pdcForTasksViewRaw.deleted_at IS null
    ) AS pdcForTasksViewRaw
      ON pdcForTasksViewRaw.design_id = innerDesignsForTasksViewRaw.id
    LEFT JOIN (
      SELECT *
      FROM components AS comForTasksViewRaw
      WHERE comForTasksViewRaw.deleted_at IS null
    ) AS comForTasksViewRaw
      ON comForTasksViewRaw.id = pdcForTasksViewRaw.component_id
    LEFT JOIN (
      SELECT *
      FROM images AS pdiForTasksViewRaw
      WHERE pdiForTasksViewRaw.deleted_at IS null
    ) AS pdiForTasksViewRaw
      ON pdiForTasksViewRaw.id = comForTasksViewRaw.sketch_id
    WHERE innerDesignsForTasksViewRaw.id = designsForTasksViewRaw.id
  ) as image_ids,

  (
    SELECT to_json(array[cwuForTasksViewRaw.*])
    FROM (:collaboratorsWithUsers) as cwuForTasksViewRaw
    JOIN collaborator_tasks as ctForTasksViewRaw
      ON ctForTasksViewRaw.collaborator_id = cwuForTasksViewRaw.id
    WHERE ctForTasksViewRaw.task_id = tasksForTasksViewRaw.id
  ) as assignees

FROM task_events as taskEventsForTasksViewRaw
JOIN tasks as tasksForTasksViewRaw
  ON taskEventsForTasksViewRaw.task_id = tasksForTasksViewRaw.id

LEFT JOIN product_design_stage_tasks as designStageTasksForTasksViewRaw
  ON tasksForTasksViewRaw.id = designStageTasksForTasksViewRaw.task_id
LEFT JOIN product_design_stages as sForTasksViewRaw
  ON sForTasksViewRaw.id = designStageTasksForTasksViewRaw.design_stage_id

LEFT JOIN product_designs as designsForTasksViewRaw
  ON designsForTasksViewRaw.id = sForTasksViewRaw.design_id
LEFT JOIN collection_designs as collectionDesignsForTasksViewRaw
  ON designsForTasksViewRaw.id = collectionDesignsForTasksViewRaw.design_id
LEFT JOIN collections as collectionsForTasksViewRaw
  ON collectionDesignsForTasksViewRaw.collection_id = collectionsForTasksViewRaw.id

WHERE designsForTasksViewRaw.deleted_at IS NULL
  AND collectionsForTasksViewRaw.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT * from task_events as taskEventsForTasksViewRaw2
    WHERE taskEventsForTasksViewRaw.task_id = taskEventsForTasksViewRaw2.task_id
      AND taskEventsForTasksViewRaw2.created_at > taskEventsForTasksViewRaw.created_at
  )
`, { collaboratorsWithUsers });
