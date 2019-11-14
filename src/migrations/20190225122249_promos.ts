import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
create table promo_codes(
  id uuid primary key,
  code text not null,
  created_at timestamp with time zone not null default now(),
  created_by uuid references users(id) not null,
  credit_amount_cents bigint not null,
  code_expires_at timestamp with time zone,
  credit_expires_at timestamp with time zone
);

create unique index promo_code_unique on promo_codes(lower(code));
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
drop table promo_codes;
  `);
}
