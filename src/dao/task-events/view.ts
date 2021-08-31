import Knex from "knex";
import db from "../../services/db";
import { getBuilder as getCollaboratorsBuilder } from "../../components/collaborators/view";
import { queryWithCollectionMeta as getDesignsBuilder } from "../../components/product-designs/dao/view";

export const ALIASES = {
  collectionId: "collectionsfortasksviewraw.id",
  designId: "designsfortasksviewraw.id",
  stageId: "stagesfortasksviewraw.id",
  stageTitle: "stagesfortasksviewraw.title",
  approvalStepId: "approvalstepsfortasksviewraw.id",
  taskStatus: "taskeventsfortasksviewraw.status",
  taskId: "tasksfortasksviewraw.id",
};

export function getAssigneesBuilder(
  collaboratorsBuilder?: Knex.QueryBuilder
): Knex.Raw {
  return db.raw(
    `
SELECT to_json(array_agg(cwufortasksviewraw.* ORDER BY cwufortasksviewraw.created_at DESC))
FROM (:collaboratorsWithUsers) as cwufortasksviewraw
JOIN collaborator_tasks as ctfortasksviewraw
  ON ctfortasksviewraw.collaborator_id = cwufortasksviewraw.id
WHERE ctfortasksviewraw.task_id = tasksfortasksviewraw.id
  `,
    {
      collaboratorsWithUsers: collaboratorsBuilder || getCollaboratorsBuilder(),
    }
  );
}

export function getMinimal(): Knex.QueryBuilder {
  return db
    .select(
      "task_events.status as status",
      "task_events.created_at as last_modified_at",
      "product_designs.id as design_id"
    )
    .from("task_events")
    .join("tasks", "task_events.task_id", "tasks.id")
    .leftJoin(
      "product_design_stage_tasks",
      "tasks.id",
      "product_design_stage_tasks.task_id"
    )
    .leftJoin(
      "product_design_stages",
      "product_design_stage_tasks.design_stage_id",
      "product_design_stages.id"
    )
    .leftJoin(
      "product_designs",
      "product_design_stages.design_id",
      "product_designs.id"
    )
    .where({ "product_designs.deleted_at": null }).andWhereRaw(`
      NOT EXISTS (
        SELECT * from task_events as te2
         WHERE task_events.task_id = te2.task_id
           AND te2.created_at > task_events.created_at
      )`);
}

export function getBuilder({
  collaboratorsBuilder,
  designIdSource = "stagesfortasksviewraw.design_id",
}: {
  collaboratorsBuilder?: Knex.QueryBuilder;
  designIdSource?: string;
} = {}): Knex.QueryBuilder {
  return db
    .select(
      "tasksfortasksviewraw.id as id",
      "tasksfortasksviewraw.created_at as created_at",
      "taskeventsfortasksviewraw.created_by as created_by",
      "taskeventsfortasksviewraw.created_at as last_modified_at",
      "taskeventsfortasksviewraw.title as title",
      "taskeventsfortasksviewraw.description as description",
      "taskeventsfortasksviewraw.ordering as ordering",
      "taskeventsfortasksviewraw.status as status",
      "taskeventsfortasksviewraw.due_date as due_date",
      "stagesfortasksviewraw.id as design_stage_id",
      "stagesfortasksviewraw.title as design_stage_title",
      "stagesfortasksviewraw.ordering as design_stage_ordering",
      "designsfortasksviewraw.id as design_id",
      "designsfortasksviewraw.created_at as design_created_at",
      "designsfortasksviewraw.title as design_title",
      "designsfortasksviewraw.image_assets as image_assets",
      "collectionsfortasksviewraw.id as collection_id",
      "collectionsfortasksviewraw.title as collection_title",
      "collectionsfortasksviewraw.created_at as collection_created_at"
    )
    .count("commentsfortasksviewraw.id as comment_count")
    .select(
      db.raw(
        `
    (:assigneesBuilder) as assignees
  `,
        { assigneesBuilder: getAssigneesBuilder(collaboratorsBuilder) }
      )
    )
    .from("task_events as taskeventsfortasksviewraw")
    .join(
      "tasks as tasksfortasksviewraw",
      "taskeventsfortasksviewraw.task_id",
      "tasksfortasksviewraw.id"
    )
    .leftJoin(
      "product_design_stage_tasks as designstagetasksfortasksviewraw",
      "designstagetasksfortasksviewraw.task_id",
      "tasksfortasksviewraw.id"
    )
    .leftJoin(
      "product_design_stages as stagesfortasksviewraw",
      "designstagetasksfortasksviewraw.design_stage_id",
      "stagesfortasksviewraw.id"
    )
    .leftJoin(
      "design_approval_step_tasks as approvalsteptasksfortasksviewraw",
      "approvalsteptasksfortasksviewraw.task_id",
      "tasksfortasksviewraw.id"
    )
    .leftJoin(
      "design_approval_steps as approvalstepsfortasksviewraw",
      "approvalsteptasksfortasksviewraw.approval_step_id",
      "approvalstepsfortasksviewraw.id"
    )
    .leftJoin(
      db.raw(
        `
    (:designsBuilder) as designsfortasksviewraw
    on designsfortasksviewraw.id = ${designIdSource}`,
        {
          designsBuilder: getDesignsBuilder(db),
        }
      )
    )
    .leftJoin(
      "collection_designs as collectiondesignsfortasksviewraw",
      "designsfortasksviewraw.id",
      "collectiondesignsfortasksviewraw.design_id"
    )
    .leftJoin("collections as collectionsfortasksviewraw", function (
      this: Knex.JoinClause
    ): void {
      this.on(
        "collectiondesignsfortasksviewraw.collection_id",
        "=",
        "collectionsfortasksviewraw.id"
      ).andOnNull("collectionsfortasksviewraw.deleted_at");
    })
    .leftJoin(
      "task_comments as taskcommentsfortasksviewraw",
      "taskcommentsfortasksviewraw.task_id",
      "tasksfortasksviewraw.id"
    )
    .leftJoin("comments as commentsfortasksviewraw", function (
      this: Knex.JoinClause
    ): void {
      this.on(
        "taskcommentsfortasksviewraw.comment_id",
        "=",
        "commentsfortasksviewraw.id"
      ).andOnNull("commentsfortasksviewraw.deleted_at");
    })
    .where({
      "designsfortasksviewraw.deleted_at": null,
    }).andWhereRaw(`
  NOT EXISTS (
      SELECT * from task_events as taskeventsfortasksviewraw2
      WHERE taskeventsfortasksviewraw.task_id = taskeventsfortasksviewraw2.task_id
        AND taskeventsfortasksviewraw2.created_at > taskeventsfortasksviewraw.created_at
    )`).groupByRaw(`(
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
    stagesfortasksviewraw.title,stagesfortasksviewraw.ordering,
    designsfortasksviewraw.id,
    designsfortasksviewraw.title,
    designsfortasksviewraw.created_at,
    designsfortasksviewraw.image_assets,
    collectionsfortasksviewraw.id,
    collectionsfortasksviewraw.title,
    collectionsfortasksviewraw.created_at
  )`);
}
