'use strict';

exports.up = function up(knex) {
  return knex.raw(`
create table product_design_comments (
  id uuid primary key,
  created_at timestamp with time zone default now(),
  deleted_at timestamp with time zone,
  section_id uuid not null references product_design_sections(id),
  text text not null,
  parent_comment_id uuid references product_design_comments(id),
  user_id uuid not null references users(id),
  is_pinned boolean not null default false
);
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
drop table product_design_comments;
  `);
};
