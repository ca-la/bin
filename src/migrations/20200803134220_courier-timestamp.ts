import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE shipment_tracking_events
ALTER COLUMN courier_timestamp SET DATA TYPE timestamp with time zone USING courier_timestamp::TIMESTAMP,
ALTER COLUMN courier_timestamp SET DEFAULT now(),
ALTER COLUMN courier_timestamp SET NOT NULL;
ALTER TABLE shipment_tracking_events
ALTER COLUMN courier_timestamp DROP DEFAULT;

DROP INDEX shipment_tracking_events_ordered;
CREATE INDEX shipment_tracking_events_ordered ON shipment_tracking_events (shipment_tracking_id, courier_timestamp);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE shipment_tracking_events
ALTER COLUMN courier_timestamp SET DATA TYPE text,
ALTER COLUMN courier_timestamp DROP NOT NULL;

DROP INDEX shipment_tracking_events_ordered;
CREATE INDEX shipment_tracking_events_ordered ON shipment_tracking_events (shipment_tracking_id, created_at);
  `);
}
