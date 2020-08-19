import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE TABLE teams (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE team_users (
  team_id UUID REFERENCES teams(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL
);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP TABLE team_users;
DROP TABLE teams;
  `);
}
