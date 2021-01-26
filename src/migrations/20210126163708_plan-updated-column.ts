import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE plans
  ADD COLUMN updated_at timestamp with time zone;

UPDATE plans SET updated_at = modified_at;

ALTER TABLE plans
ALTER COLUMN updated_at SET NOT NULL,
ALTER COLUMN updated_at SET DEFAULT now(),
 DROP COLUMN modified_at;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE plans
  ADD COLUMN modified_at timestamp with time zone;

UPDATE plans SET modified_at = updated_at;

ALTER TABLE plans
ALTER COLUMN modified_at SET NOT NULL,
ALTER COLUMN modified_at SET DEFAULT now(),
 DROP COLUMN updated_at;
  `);
}
