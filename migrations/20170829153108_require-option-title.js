'use strict';

exports.up = function up(knex) {
  return knex.raw(`
update product_design_options
  set title = 'Untitled'
  where title is null;

update product_design_options
  set type = 'TRIM'
  where type is null;

update product_design_options
  set is_builtin_option = true
  where is_builtin_option = false
    and user_id is null;

alter table product_design_options
  alter column title
    set not null,
  alter column type
    set not null;

alter table product_design_options
  add constraint user_id_or_builtin check (
    user_id is not null or is_builtin_option = true
  );
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_options
  drop constraint user_id_or_builtin;

alter table product_design_options
  alter column title
    drop not null,
  alter column type
    drop not null;
  `);
};
