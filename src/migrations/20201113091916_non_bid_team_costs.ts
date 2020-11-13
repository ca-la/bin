import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
create table non_bid_team_costs (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone,
  team_id uuid not null references teams(id),
  category text not null,
  note text,
  created_by uuid not null references users(id),
  cents bigint not null
);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
drop table non_bid_team_costs;
  `);
}
