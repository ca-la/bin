import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE SEQUENCE referral_code_increment;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP SEQUENCE referral_code_increment;
  `);
}
