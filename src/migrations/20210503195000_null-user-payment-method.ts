import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE payment_methods
      ALTER COLUMN user_id DROP NOT NULL;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE payment_methods
      ALTER COLUMN user_id SET NOT NULL;
  `);
}
