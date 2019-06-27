import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE invoices
ADD COLUMN short_id text;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE invoices
DROP COLUMN short_id;
  `);
}
