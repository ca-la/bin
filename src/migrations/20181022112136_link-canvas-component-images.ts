import * as Knex from 'knex';

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table product_design_canvases
  add column component_id uuid references components(id);

alter table components add column type text not null;
alter table components add column created_by uuid references users(id);
alter table components add column deleted_at timestamp with time zone default null;
alter table components add column material_id uuid references product_design_options(id);
alter table components add column artwork_id uuid references product_design_images(id);
alter table components add column sketch_id uuid references product_design_images(id);
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table product_design_canvases drop column component_id;
alter table components drop column type;
alter table components drop column created_by;
alter table components drop column deleted_at;
alter table components drop column material_id;
alter table components drop column artwork_id;
alter table components drop column sketch_id;
  `);
}
