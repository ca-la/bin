import Knex from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("pricing_bids", (table: Knex.TableBuilder) => {
    table.uuid("id").primary();
    table.timestamp("created_at").defaultTo(knex.fn.now()).notNullable();
    table.uuid("created_by").references("id").inTable("users").notNullable();
    table
      .uuid("quote_id")
      .references("id")
      .inTable("pricing_quotes")
      .notNullable();
    table.integer("bid_price_cents").notNullable();
    table.text("description");

    table.index(["quote_id"]);
  });
  await knex.schema.alterTable("design_events", (table: Knex.TableBuilder) => {
    table.uuid("bid_id").references("id").inTable("pricing_bids");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("design_events", (table: Knex.TableBuilder) => {
    table.dropColumn("bid_id");
  });
  await knex.schema.dropTable("pricing_bids");
}
