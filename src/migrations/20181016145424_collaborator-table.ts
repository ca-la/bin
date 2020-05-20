import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
alter table product_design_collaborators rename to collaborators;

alter table collaborators
  add column collection_id uuid references collections(id),
  alter column design_id drop not null,
  add constraint design_or_collection check (
    (design_id is null) != (collection_id is null)
  );

create view product_design_collaborators as
  select * from collaborators;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
drop view product_design_collaborators;

alter table collaborators
  drop constraint design_or_collection,
  drop column collection_id,
  alter column design_id set not null;

alter table collaborators rename to product_design_collaborators;
  `);
}
