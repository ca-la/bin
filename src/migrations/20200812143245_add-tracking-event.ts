import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE design_events
      ADD COLUMN shipment_tracking_event_id UUID REFERENCES shipment_tracking_events;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE design_events
      DROP COLUMN shipment_tracking_event_id;
  `);
}
