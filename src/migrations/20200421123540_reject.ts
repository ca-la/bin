import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table design_events
  add column approval_submission_id uuid references design_approval_submissions (id),
  add column comment_id uuid references comments (id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table design_events
  drop column approval_submission_id,
  drop column comment_id;
  `);
}
