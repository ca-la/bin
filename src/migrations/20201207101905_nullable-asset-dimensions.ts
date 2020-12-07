import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE assets
      ALTER COLUMN original_height_px DROP NOT NULL,
      ALTER COLUMN original_width_px DROP NOT NULL;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE assets
      ALTER COLUMN original_height_px SET NOT NULL,
      ALTER COLUMN original_width_px SET NOT NULL;
  `);
}
