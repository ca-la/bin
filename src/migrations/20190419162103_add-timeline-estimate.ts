import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE pricing_product_types
  ADD COLUMN creation_time_ms bigint,
  ADD COLUMN specification_time_ms bigint,
  ADD COLUMN sourcing_time_ms bigint,
  ADD COLUMN sampling_time_ms bigint,
  ADD COLUMN pre_production_time_ms bigint,
  ADD COLUMN production_time_ms bigint,
  ADD COLUMN fulfillment_time_ms bigint;


UPDATE pricing_product_types SET
  creation_time_ms = 0,
  specification_time_ms = 0,
  sourcing_time_ms = 0,
  sampling_time_ms = 0,
  pre_production_time_ms = 0,
  production_time_ms = 0,
  fulfillment_time_ms = 0;

ALTER TABLE pricing_product_types
  ALTER COLUMN creation_time_ms SET NOT NULL,
  ALTER COLUMN specification_time_ms SET NOT NULL,
  ALTER COLUMN sourcing_time_ms SET NOT NULL,
  ALTER COLUMN sampling_time_ms SET NOT NULL,
  ALTER COLUMN pre_production_time_ms SET NOT NULL,
  ALTER COLUMN production_time_ms SET NOT NULL,
  ALTER COLUMN fulfillment_time_ms SET NOT NULL;

ALTER TABLE pricing_quotes
  ADD COLUMN creation_time_ms bigint,
  ADD COLUMN specification_time_ms bigint,
  ADD COLUMN sourcing_time_ms bigint,
  ADD COLUMN sampling_time_ms bigint,
  ADD COLUMN pre_production_time_ms bigint,
  ADD COLUMN production_time_ms bigint,
  ADD COLUMN fulfillment_time_ms bigint;


UPDATE pricing_quotes SET
  creation_time_ms = 0,
  specification_time_ms = 0,
  sourcing_time_ms = 0,
  sampling_time_ms = 0,
  pre_production_time_ms = 0,
  production_time_ms = 0,
  fulfillment_time_ms = 0;

ALTER TABLE pricing_quotes
  ALTER COLUMN creation_time_ms SET NOT NULL,
  ALTER COLUMN specification_time_ms SET NOT NULL,
  ALTER COLUMN sourcing_time_ms SET NOT NULL,
  ALTER COLUMN sampling_time_ms SET NOT NULL,
  ALTER COLUMN pre_production_time_ms SET NOT NULL,
  ALTER COLUMN production_time_ms SET NOT NULL,
  ALTER COLUMN fulfillment_time_ms SET NOT NULL;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
ALTER TABLE pricing_product_types
  DROP COLUMN creation_time_ms,
  DROP COLUMN specification_time_ms,
  DROP COLUMN sourcing_time_ms,
  DROP COLUMN sampling_time_ms,
  DROP COLUMN pre_production_time_ms,
  DROP COLUMN production_time_ms,
  DROP COLUMN fulfillment_time_ms;

ALTER TABLE pricing_quotes
  DROP COLUMN creation_time_ms,
  DROP COLUMN specification_time_ms,
  DROP COLUMN sourcing_time_ms,
  DROP COLUMN sampling_time_ms,
  DROP COLUMN pre_production_time_ms,
  DROP COLUMN production_time_ms,
  DROP COLUMN fulfillment_time_ms;
  `);
}
