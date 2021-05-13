import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE payment_methods
      DROP COLUMN user_id,
      ALTER COLUMN customer_id SET NOT NULL;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE payment_methods
      ADD COLUMN user_id UUID REFERENCES users(id),
      ALTER COLUMN customer_id DROP NOT NULL;
  `);
}
