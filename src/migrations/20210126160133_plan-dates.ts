import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE plans
  ADD COLUMN deleted_at timestamp with time zone,
  ADD COLUMN modified_at timestamp with time zone;

UPDATE plans SET modified_at = created_at;

ALTER TABLE plans
  ALTER COLUMN modified_at SET NOT NULL,
  ALTER COLUMN modified_at SET DEFAULT now();
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE plans
 DROP COLUMN deleted_at,
 DROP COLUMN modified_at;
  `);
}
