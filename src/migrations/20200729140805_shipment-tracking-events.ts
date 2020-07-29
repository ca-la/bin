import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE TABLE shipment_tracking_events (
  id UUID PRIMARY KEY,
  shipment_tracking_id UUID REFERENCES shipment_trackings (id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  courier TEXT NOT NULL,
  tag TEXT NOT NULL,
  subtag TEXT NOT NULL,

  location TEXT,
  country TEXT,
  message TEXT,
  courier_timestamp TEXT,
  courier_tag TEXT
);
CREATE INDEX shipment_tracking_events_ordered ON shipment_tracking_events (shipment_tracking_id, created_at);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP INDEX shipment_tracking_events_ordered;
DROP TABLE shipment_tracking_events;
  `);
}
