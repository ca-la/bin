import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE approved_signups
ALTER COLUMN first_name DROP not null,
ALTER COLUMN last_name DROP not null;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE approved_signups
ALTER COLUMN first_name SET not null,
ALTER COLUMN last_name SET not null;
  `);
}
