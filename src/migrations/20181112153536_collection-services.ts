import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
create table collection_services (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone,
  collection_id uuid references collections(id) not null,
  created_by uuid references users(id) not null,
  needs_design_consulting boolean not null default false,
  needs_fulfillment boolean not null default false,
  needs_packaging boolean not null default false
);

create index collection_service_fk_index on collection_services (collection_id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
drop index collection_service_fk_index;
drop table collection_services;
  `);
}
