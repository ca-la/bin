import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table subscriptions
  alter column user_id drop not null,
  add column team_id uuid references teams(id),
  add constraint user_or_team CHECK (
    user_id IS NOT NULL or team_id IS NOT NULL
  )
;`);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table subscriptions
  drop constraint user_or_team,
  drop column team_id,
  alter column user_id set not null
;`);
}
