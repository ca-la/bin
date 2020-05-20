import Knex from "knex";

export function up(knex: Knex): Knex.Raw {
  return knex.raw(`
drop view product_design_collaborators;
  `);
}

export function down(knex: Knex): Knex.Raw {
  return knex.raw(`
create view product_design_collaborators as
  select * from collaborators;
  `);
}
