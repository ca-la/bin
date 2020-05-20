"use strict";

exports.up = function up(knex) {
  return knex.raw(`
drop index collaborators_unique_id;
drop index collaborators_unique_email;

create unique index collaborators_unique_id
  on product_design_collaborators(design_id, user_id)
    where deleted_at is null;

create unique index collaborators_unique_email
  on product_design_collaborators(design_id, lower(user_email))
    where deleted_at is null;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop index collaborators_unique_id;
drop index collaborators_unique_email;

create unique index collaborators_unique_id
  on product_design_collaborators(user_id)
    where deleted_at is null;

create unique index collaborators_unique_email
  on product_design_collaborators(lower(user_email))
    where deleted_at is null;
  `);
};
