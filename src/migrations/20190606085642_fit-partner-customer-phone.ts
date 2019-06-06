import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table fit_partner_customers
  add column phone text,
  alter column shopify_user_id drop not null,
  add constraint shopify_or_phone check (
    shopify_user_id is not null or phone is not null
  );
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table fit_partner_customers
  drop constraint shopify_or_phone,
  alter column shopify_user_id set not null,
  drop column phone;
  `);
}
