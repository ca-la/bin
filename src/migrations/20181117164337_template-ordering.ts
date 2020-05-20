import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    alter table stage_templates add column ordering integer not null default 0;
    alter table product_design_stages add column ordering integer not null default 0;
    alter table task_templates add column ordering integer not null default 0;
    alter table tasks add column ordering integer not null default 0;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    alter table stage_templates drop column ordering;
    alter table product_design_stages drop column ordering;
    alter table task_templates drop column ordering;
    alter table tasks drop column ordering;
  `);
}
