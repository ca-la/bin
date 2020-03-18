import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE TABLE invoice_addresses (
  id uuid primary key,
  user_id uuid not null references users(id),
  company_name text,
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  region text not null,
  post_code text not null,
  country text not null,
  created_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone
);
ALTER TABLE invoices ADD COLUMN invoice_addresses_id uuid references invoice_addresses(id);
`);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE invoices DROP COLUMN invoice_addresses_id;
DROP TABLE invoice_addresses;
  `);
}
