import Knex from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(
    "pricing_cost_inputs",
    (table: Knex.TableBuilder) => {
      table.uuid("id").primary();
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.timestamp("deleted_at");
      table
        .uuid("design_id")
        .references("id")
        .inTable("product_designs")
        .notNullable();
      table.text("product_type").notNullable();
      table.text("product_complexity").notNullable();
      table.text("material_category").notNullable();
      table.integer("material_budget_cents").notNullable();

      table.index(["design_id"]);
    }
  );
  await knex.schema.createTable(
    "pricing_cost_input_processes",
    (table: Knex.TableBuilder) => {
      table.uuid("id").primary();
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.text("name").notNullable();
      table.text("complexity").notNullable();
      table
        .uuid("pricing_cost_input_id")
        .references("id")
        .inTable("pricing_cost_inputs")
        .notNullable();

      table.index(["pricing_cost_input_id"]);
    }
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("pricing_cost_input_processes");
  await knex.schema.dropTable("pricing_cost_inputs");
}
