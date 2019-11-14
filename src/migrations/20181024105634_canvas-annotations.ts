import Knex from 'knex';

/* tslint:disable:max-line-length */
export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
create table product_design_canvas_annotations (
  id uuid primary key,
  created_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone,
  canvas_id uuid references product_design_canvases(id) not null,
  created_by uuid references users(id) not null,
  x integer not null,
  y integer not null
);

create table product_design_canvas_annotation_comments (
  comment_id uuid references comments(id) primary key,
  annotation_id uuid references product_design_canvas_annotations(id) not null
);

create index canvas_annotations_annotation_index on product_design_canvas_annotation_comments (annotation_id);
  `);
}

/* tslint:enable:max-line-length */
export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
drop index canvas_annotations_annotation_index;
drop table product_design_canvas_annotation_comments;
drop table product_design_canvas_annotations;
  `);
}
