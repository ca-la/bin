'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table invoices
  add constraint user_or_design check (
    (user_id is null) != (design_id is null)
  );
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table invoices
  drop constraint user_or_design;
  `);
};
