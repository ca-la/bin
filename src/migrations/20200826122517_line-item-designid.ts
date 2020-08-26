import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table line_items
  alter column design_id set not null;

create unique index one_line_item_per_design
on line_items(design_id)
where created_at > '2020-08-25';
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
drop index one_line_item_per_design;

alter table line_items
  alter column design_id drop not null;
  `);
}
