import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP VIEW IF EXISTS detail_tasks;
CREATE VIEW detail_tasks AS
SELECT t.id as id, t.created_at as created_at, te.created_by as created_by, te.title as title,
       te.description as description, te.ordering as ordering, te.status as status,
       te.due_date as due_date,
       s.id as design_stage_id, s.title as design_stage_title,
       d.id as design_id, d.title as design_title,
       d.preview_image_urls as design_preview_image_urls,
       c.id as collection_id, c.title as collection_title

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
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP VIEW IF EXISTS detail_tasks;

CREATE VIEW detail_tasks AS
SELECT t.id as id, t.created_at as created_at, te.created_by as created_by, te.title as title,
       te.description as description, te.ordering as ordering, te.status as status,
       te.due_date as due_date,
       s.id as design_stage_id, s.title as design_stage_title,
       d.id as design_id, d.title as design_title,
       c.id as collection_id, c.title as collection_title

FROM task_events as te
JOIN tasks as t ON te.task_id = t.id

LEFT JOIN product_design_stage_tasks as dst ON t.id = dst.task_id
LEFT JOIN product_design_stages as s ON s.id = dst.design_stage_id

LEFT JOIN product_designs as d ON d.id = s.design_id
LEFT JOIN collection_designs as cd ON d.id = cd.design_id
LEFT JOIN collections as c ON cd.collection_id = c.id
WHERE NOT EXISTS (
  SELECT * from task_events as te2
  WHERE te.task_id = te2.task_id
    AND te2.created_at > te.created_at
);
  `);
}
