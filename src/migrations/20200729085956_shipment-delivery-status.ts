import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE shipment_trackings
  ADD COLUMN expected_delivery TIMESTAMP WITH TIME ZONE,
  ADD COLUMN delivery_date TIMESTAMP WITH TIME ZONE;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE shipment_trackings
 DROP COLUMN expected_delivery,
 DROP COLUMN delivery_date;
  `);
}
