import Knex from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("cohorts", (table: Knex.TableBuilder) => {
    table.uuid("id").primary();
    table.text("slug").notNullable().unique();
    table.text("title");
    table.text("description");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.uuid("created_by").references("users.id").notNullable();
  });
  await knex.schema.createTable("cohort_users", (table: Knex.TableBuilder) => {
    table.uuid("cohort_id").references("cohorts.id").notNullable();
    table.uuid("user_id").references("users.id").notNullable();
    table.primary(["cohort_id", "user_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("cohort_users");
  await knex.schema.dropTable("cohorts");
}
