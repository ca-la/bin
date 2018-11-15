import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    alter table notifications
    add column collection_id uuid references collections(id),
    alter column design_id drop not null,
    add column task_id uuid references tasks(id),
    add column stage_id uuid references product_design_stages(id),
    add column comment_id uuid references comments(id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    alter table notifications
    drop column collection_id,
    alter column design_id set not null,
    drop column task_id,
    drop column stage_id,
    drop column comment_id;
  `);
}
