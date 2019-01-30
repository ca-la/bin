import * as Knex from 'knex';
import { DETAIL_TASKS_UP as DETAIL_TASKS_DOWN } from './20190129125138_add-stage-ordering';

export const DETAIL_TASKS_UP = `
DROP VIEW detail_tasks;
CREATE VIEW detail_tasks AS
SELECT t.id as id,
     t.created_at as created_at,
     te.created_by as created_by,
     te.title as title,
     te.description as description,
     te.ordering as ordering,
     te.status as status,
     te.due_date as due_date,
     s.id as design_stage_id,
     s.title as design_stage_title,
     s.ordering as design_stage_ordering,
     d.id as design_id,
     d.title as design_title,
     c.id as collection_id,
     c.title as collection_title,
     (
       SELECT COUNT(*)
       FROM task_comments as tc
       JOIN comments as c ON  tc.comment_id = c.id
       WHERE tc.task_id = t.id AND c.deleted_at IS NULL
     ) as comment_count,
     (
       SELECT array_remove(array_agg(pdi.id), null) AS image_ids
       FROM product_designs AS inner_designs
       LEFT JOIN (SELECT * FROM product_design_canvases AS pdc WHERE pdc.deleted_at IS null)
         AS pdc
         ON pdc.design_id = inner_designs.id
       LEFT JOIN (SELECT * FROM components AS com WHERE com.deleted_at IS null)
         AS com
         ON com.id = pdc.component_id
       LEFT JOIN (SELECT * FROM product_design_images AS pdi WHERE pdi.deleted_at IS null)
         AS pdi
         ON pdi.id = com.sketch_id
       WHERE inner_designs.id = d.id
     ) as image_ids

FROM task_events as te
JOIN tasks as t ON te.task_id = t.id

LEFT JOIN product_design_stage_tasks as dst ON t.id = dst.task_id
LEFT JOIN product_design_stages as s ON s.id = dst.design_stage_id

LEFT JOIN product_designs as d ON d.id = s.design_id
LEFT JOIN collection_designs as cd ON d.id = cd.design_id
LEFT JOIN collections as c ON cd.collection_id = c.id

WHERE d.deleted_at IS NULL
  AND c.deleted_at IS NULL
  AND NOT EXISTS (
  SELECT * from task_events as te2
  WHERE te.task_id = te2.task_id
    AND te2.created_at > te.created_at
  );
`;

export function up(knex: Knex): Knex.Raw {
  return knex.raw(DETAIL_TASKS_UP);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(DETAIL_TASKS_DOWN);
}
