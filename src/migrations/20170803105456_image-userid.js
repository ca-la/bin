'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table product_design_images
  drop column design_id,
  add column user_id uuid not null references users(id);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_images
  drop column user_id,
  add column design_id uuid not null references product_designs(id);
  `);
};
