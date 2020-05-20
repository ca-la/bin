import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE addresses
      ADD COLUMN phone TEXT;

    ALTER TABLE invoice_addresses
      ADD COLUMN phone TEXT;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE addresses
      DROP COLUMN phone;

    ALTER TABLE invoice_addresses
      DROP COLUMN phone;
  `);
}
