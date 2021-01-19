import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE plans
      ADD COLUMN includes_fulfillment BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN upgrade_to_plan_id UUID REFERENCES plans;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE plans
      DROP COLUMN includes_fulfillment,
      DROP COLUMN upgrade_to_plan_id;
  `);
}
