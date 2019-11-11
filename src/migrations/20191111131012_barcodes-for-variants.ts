import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table product_design_variants
  add column universal_product_code text unique check (length(universal_product_code) = 12);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table product_design_variants drop column universal_product_code;
  `);
}
