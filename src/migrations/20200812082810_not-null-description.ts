import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE shipment_trackings
      ALTER COLUMN description SET DEFAULT 'A shipment',
      ALTER COLUMN description SET NOT NULL;

    ALTER TABLE shipment_trackings
      ALTER COLUMN description DROP DEFAULT;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE shipment_trackings
      ALTER COLUMN description DROP NOT NULL;
  `);
}
