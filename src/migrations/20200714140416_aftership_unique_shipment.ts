import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE UNIQUE INDEX unique_shipment_tracking_id ON aftership_trackings (shipment_tracking_id);

ALTER TABLE aftership_trackings DROP CONSTRAINT aftership_trackings_pkey;

ALTER INDEX unique_shipment_tracking_id RENAME TO aftership_trackings_pkey;

ALTER TABLE aftership_trackings ADD PRIMARY KEY USING INDEX aftership_trackings_pkey;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
CREATE UNIQUE INDEX unique_aftership_id ON aftership_trackings (id);

ALTER TABLE aftership_trackings DROP CONSTRAINT aftership_trackings_pkey;

ALTER INDEX unique_aftership_id RENAME TO aftership_trackings_pkey;

ALTER TABLE aftership_trackings ADD PRIMARY KEY USING INDEX aftership_trackings_pkey;
  `);
}
