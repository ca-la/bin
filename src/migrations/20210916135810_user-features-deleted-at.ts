import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE user_features
 DROP COLUMN updated_at,
  ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX user_features_partial_idx ON user_features(user_id, name) WHERE deleted_at IS NULL;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP INDEX user_features_partial_idx;

ALTER TABLE user_features
 DROP COLUMN deleted_at,
  ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
  `);
}
