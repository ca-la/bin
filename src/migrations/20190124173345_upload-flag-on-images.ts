import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table product_design_images
add column upload_completed_at timestamp with time zone default null;

update product_design_images set upload_completed_at = created_at;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table product_design_images
drop column upload_completed_at;
  `);
}
