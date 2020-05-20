import Knex from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("pricing_quotes", (table: Knex.TableBuilder) => {
    table.uuid("design_id").references("id").inTable("product_designs");
    table.index(["design_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("pricing_quotes", (table: Knex.TableBuilder) => {
    table.dropIndex(["design_id"]);
    table.dropColumn("design_id");
  });
}
