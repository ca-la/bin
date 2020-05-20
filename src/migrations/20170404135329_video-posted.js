"use strict";

exports.up = function up(knex) {
  return knex.raw(`
alter table productvideos
  add column poster_image_url text;

update productvideos
  set poster_image_url = 'https://example.com/image.jpg';

alter table productvideos
  alter column poster_image_url set not null;
  `);
};

exports.down = function down(knex) {
  return knex.raw(`
alter table productvideos
  drop column poster_image_url;
  `);
};
