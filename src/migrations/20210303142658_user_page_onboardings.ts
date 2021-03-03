import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE TABLE user_page_onboardings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users (id),
  page text NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE,

  UNIQUE (user_id, page)
);
CREATE INDEX user_page_onboardings_covering_idx ON user_page_onboardings (user_id, page, viewed_at, id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP INDEX user_page_onboardings_covering_idx;
DROP TABLE user_page_onboardings;
  `);
}
