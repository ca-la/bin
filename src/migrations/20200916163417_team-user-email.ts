import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table team_users
  add column user_email text,
  alter column user_id drop not null;

alter table team_users
  add constraint user_id_or_email check (
    (user_id is null and user_email is not null) or
    (user_id is not null and user_email is null)
  );
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table team_users
  drop constraint user_id_or_email;

alter table team_users
  drop column user_email,
  alter column user_id set not null;
  `);
}
