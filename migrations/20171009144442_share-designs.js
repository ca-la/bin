'use strict';

exports.up = function up(knex) {
  return knex.raw(`
create table product_design_collaborators (
  id uuid primary key,
  design_id uuid not null references product_designs(id),
  user_id uuid references users(id),
  user_email text,
  role text,
  created_at timestamp with time zone default now(),
  deleted_at timestamp with time zone
);

alter table product_design_collaborators
  add constraint user_id_or_email check (
    (user_id is null and user_email is not null) or
    (user_id is not null and user_email is null)
  );

create unique index collaborators_unique_id
  on product_design_collaborators(user_id)
    where deleted_at is null;

create unique index collaborators_unique_email
  on product_design_collaborators(lower(user_email))
    where deleted_at is null;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop index collaborators_unique_id;
drop index collaborators_unique_email;

alter table product_design_collaborators
  drop constraint user_id_or_email;

drop table product_design_collaborators;
  `);
};
