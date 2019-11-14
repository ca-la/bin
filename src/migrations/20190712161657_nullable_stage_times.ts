import Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
    ALTER TABLE pricing_quotes
      ALTER COLUMN creation_time_ms DROP NOT NULL,
      ALTER COLUMN specification_time_ms DROP NOT NULL,
      ALTER COLUMN sourcing_time_ms DROP NOT NULL,
      ALTER COLUMN sampling_time_ms DROP NOT NULL,
      ALTER COLUMN pre_production_time_ms DROP NOT NULL,
      ALTER COLUMN production_time_ms DROP NOT NULL,
      ALTER COLUMN fulfillment_time_ms DROP NOT NULL,
      ALTER COLUMN process_time_ms DROP NOT NULL;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
    UPDATE pricing_quotes SET
      creation_time_ms = 0
    WHERE
      creation_time_ms IS NULL;

    UPDATE pricing_quotes SET
      specification_time_ms = 0
    WHERE
      specification_time_ms IS NULL;

    UPDATE pricing_quotes SET
      sourcing_time_ms = 0
    WHERE
      sourcing_time_ms IS NULL;

    UPDATE pricing_quotes SET
      sampling_time_ms = 0
    WHERE
      sampling_time_ms IS NULL;

    UPDATE pricing_quotes SET
      pre_production_time_ms = 0
    WHERE
      pre_production_time_ms IS NULL;

    UPDATE pricing_quotes SET
      production_time_ms = 0
    WHERE
      production_time_ms IS NULL;

    UPDATE pricing_quotes SET
      fulfillment_time_ms = 0
    WHERE
      fulfillment_time_ms IS NULL;

    UPDATE pricing_quotes SET
      process_time_ms = 0
    WHERE
      process_time_ms IS NULL;

    ALTER TABLE pricing_quotes
      ALTER COLUMN creation_time_ms SET NOT NULL,
      ALTER COLUMN specification_time_ms SET NOT NULL,
      ALTER COLUMN sourcing_time_ms SET NOT NULL,
      ALTER COLUMN sampling_time_ms SET NOT NULL,
      ALTER COLUMN pre_production_time_ms SET NOT NULL,
      ALTER COLUMN production_time_ms SET NOT NULL,
      ALTER COLUMN fulfillment_time_ms SET NOT NULL,
      ALTER COLUMN process_time_ms SET NOT NULL;
  `);
}
