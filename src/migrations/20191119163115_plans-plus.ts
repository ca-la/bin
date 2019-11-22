import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table plans
  add column is_public boolean not null default false,
  add column description text,
  add column ordering smallint unique,
  add constraint public_plans_have_order check
    (is_public is false or (ordering is not null));
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table plans
  drop constraint public_plans_have_order,
  drop column is_public,
  drop column description,
  drop column ordering;
  `);
}
