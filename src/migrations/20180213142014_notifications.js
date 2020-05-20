"use strict";

exports.up = function up(knex) {
  return knex.raw(`
create table notifications (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  sent_email_at timestamp with time zone,
  design_id uuid not null references product_designs(id),
  section_id uuid references product_design_sections(id),
  actor_user_id uuid references users(id) not null,
  recipient_user_id uuid references users(id) not null,
  type text,
  action_description text
);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop table notifications;
  `);
};
