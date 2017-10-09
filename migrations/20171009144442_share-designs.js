'use strict';

exports.up = function up(knex) {
  return knex.raw(`
create table product_design_users (
  id uuid primary key,
  design_id uuid not null references product_designs(id),
  user_id uuid references users(id),
  user_email text,
  role text
);

alter table product_design_users
  add constraint user_id_or_email check (
    (user_id is null and user_email is not null) or
    (user_id is not null and user_email is null)
  );
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table product_design_users
  drop constraint user_id_or_email;

drop table product_design_users;
  `);
};
