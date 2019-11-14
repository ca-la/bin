import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE artwork_attributes
  ADD COLUMN id uuid primary key,
  ADD COLUMN created_at timestamp with time zone not null default now(),
  ADD COLUMN created_by uuid references users(id) not null,
  ADD COLUMN deleted_at timestamp with time zone;
;

ALTER TABLE material_attributes
  ADD COLUMN id uuid primary key,
  ADD COLUMN created_at timestamp with time zone not null default now(),
  ADD COLUMN created_by uuid references users(id) not null,
  ADD COLUMN deleted_at timestamp with time zone;

ALTER TABLE sketch_attributes
  ADD COLUMN id uuid primary key,
  ADD COLUMN created_at timestamp with time zone not null default now(),
  ADD COLUMN created_by uuid references users(id) not null,
  ADD COLUMN deleted_at timestamp with time zone;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE artwork_attributes
  DROP COLUMN id,
  DROP COLUMN created_at,
  DROP COLUMN created_by,
  DROP COLUMN deleted_at;
;

ALTER TABLE material_attributes
  DROP COLUMN id,
  DROP COLUMN created_at,
  DROP COLUMN created_by,
  DROP COLUMN deleted_at;

ALTER TABLE sketch_attributes
  DROP COLUMN id,
  DROP COLUMN created_at,
  DROP COLUMN created_by,
  DROP COLUMN deleted_at;
  `);
}
