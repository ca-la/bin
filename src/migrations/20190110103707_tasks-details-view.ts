import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE INDEX task_events_task_id_index ON task_events (task_id);
CREATE INDEX product_design_stage_tasks_task_id_index ON product_design_stage_tasks (task_id);
CREATE INDEX product_design_stage_tasks_design_stage_id_index
    ON product_design_stage_tasks (design_stage_id);
CREATE INDEX product_design_stages_design_id_index ON product_design_stages (design_id);
CREATE INDEX collection_designs_collection_id_index ON collection_designs (collection_id);

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

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP INDEX task_events_task_id_index;
DROP INDEX product_design_stage_tasks_task_id_index;
DROP INDEX product_design_stage_tasks_design_stage_id_index;
DROP INDEX product_design_stages_design_id_index;
DROP INDEX collection_designs_collection_id_index;
DROP VIEW detail_tasks;
  `);
}
