'use strict';

exports.up = function up(knex) {
  return knex.raw(`
alter table fit_partners
  add column admin_user_id uuid references users(id);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table fit_partners
  drop column admin_user_id;
  `);
};
