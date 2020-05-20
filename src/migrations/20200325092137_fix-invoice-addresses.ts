import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE invoices RENAME COLUMN invoice_addresses_id TO invoice_address_id;
ALTER TABLE invoice_addresses ADD COLUMN address_id uuid references addresses(id);
`);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE invoices RENAME COLUMN invoice_address_id TO invoice_addresses_id;
ALTER TABLE invoice_addresses DROP COLUMN address_id;
  `);
}
