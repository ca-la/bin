import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE TABLE pricing_process_timelines (
  id uuid PRIMARY KEY,
  created_at timestamp with time zone not null default now(),
  version integer NOT NULL,
  unique_processes integer NOT NULL,
  minimum_units integer NOT NULL,
  time_ms bigint NOT NULL
);

ALTER TABLE pricing_inputs
  ADD COLUMN pricing_process_timeline_id uuid references pricing_process_timelines(id);

ALTER TABLE pricing_quotes
  ADD COLUMN process_time_ms bigint;

UPDATE pricing_quotes SET process_time_ms = 0;

ALTER TABLE pricing_quotes
  ALTER COLUMN process_time_ms SET NOT NULL;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE pricing_inputs DROP COLUMN pricing_process_timeline_id;
ALTER TABLE pricing_quotes DROP COLUMN process_time_ms;
DROP TABLE pricing_process_timelines;
  `);
}
