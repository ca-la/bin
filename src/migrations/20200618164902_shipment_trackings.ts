import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE TABLE shipment_trackings (
  id UUID PRIMARY KEY,
  courier TEXT NOT NULL,
  tracking_id TEXT NOT NULL,
  description TEXT,
  approval_step_id UUID REFERENCES design_approval_steps(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE aftership_trackings (
  id TEXT PRIMARY KEY,
  shipment_tracking_id UUID REFERENCES shipment_trackings(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
DROP TABLE aftership_trackings;
DROP TABLE shipment_trackings;
  `);
}
