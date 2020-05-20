import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table users
  add column subscription_waived_at timestamp with time zone;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table users
  drop column subscription_waived_at;
  `);
}
