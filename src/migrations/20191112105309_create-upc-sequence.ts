import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE SEQUENCE universal_product_code_increment;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP SEQUENCE universal_product_code_increment;
  `);
}
