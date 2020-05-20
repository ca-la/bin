import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    alter table notifications
    add column collaborator_id uuid references collaborators(id),
    alter column recipient_user_id drop not null;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    alter table notifications
    drop column collaborator_id,
    alter column recipient_user_id set not null;
  `);
}
