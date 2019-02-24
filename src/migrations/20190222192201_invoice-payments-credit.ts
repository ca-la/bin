import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table invoice_payments
  add column credit_user_id uuid references users(id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table invoice_payments
  drop column credit_user_id;
  `);
}
