"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table users
  add column last_accepted_designer_terms_at timestamp with time zone,
  add column last_accepted_partner_terms_at timestamp with time zone;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table users
  drop column last_accepted_designer_terms_at,
  drop column last_accepted_partner_terms_at;
  `);
};
