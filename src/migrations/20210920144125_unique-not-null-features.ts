import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE user_features
 DROP CONSTRAINT user_features_user_id_name_key;

CREATE UNIQUE INDEX user_features_user_id_name_deleted_at ON
       user_features (user_id, name) WHERE deleted_at IS NULL;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP INDEX user_features_user_id_name_deleted_at;

ALTER TABLE user_features
  ADD CONSTRAINT user_features_user_id_name_key UNIQUE (user_id, name);
  `);
}
