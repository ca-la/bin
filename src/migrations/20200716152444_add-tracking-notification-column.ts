import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE notifications
  ADD COLUMN shipment_tracking_id uuid REFERENCES shipment_trackings(id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE notifications
 DROP COLUMN shipment_tracking_id;
  `);
}
