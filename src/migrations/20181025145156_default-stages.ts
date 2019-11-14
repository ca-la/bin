import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
create table stage_templates (
  id uuid primary key,
  title text not null,
  description text
);

alter table product_design_stages
  add column stage_template_id uuid references stage_templates(id);

create table task_templates (
  id uuid primary key,
  stage_template_id uuid references stage_templates not null,
  assignee_role text not null,
  design_phase text not null,
  title text not null,
  description text
);

create unique index collection_unique_design on collection_designs (design_id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
drop index collection_unique_design;

drop table task_templates;

alter table product_design_stages
  drop column stage_template_id;

drop table stage_templates;
  `);
}
