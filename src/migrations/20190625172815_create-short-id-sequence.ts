import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE SEQUENCE short_id_increment;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP SEQUENCE short_id_increment;
  `);
}
