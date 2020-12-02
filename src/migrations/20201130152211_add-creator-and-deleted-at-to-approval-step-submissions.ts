import Knex from "knex";

export function up(knex: Knex): Knex.SchemaBuilder {
  return knex.schema.alterTable(
    "design_approval_submissions",
    (table: Knex.AlterTableBuilder) => {
      table.timestamp("deleted_at");
      // nullable because we have a lot of custom submissions and there is no
      // way to detect their initial creator
      table.uuid("created_by").references("id").inTable("users");
    }
  );
}

export function down(knex: Knex): Knex.SchemaBuilder {
  return knex.schema.alterTable(
    "design_approval_submissions",
    (table: Knex.AlterTableBuilder) => {
      table.dropColumn("deleted_at");
      table.dropColumn("created_by");
    }
  );
}
