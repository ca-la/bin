import Knex from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(
    'pricing_care_labels',
    (table: Knex.CreateTableBuilder) => {
      table.uuid('id').primary();
      table.integer('version').notNullable();
      table.integer('minimum_units').notNullable();
      table.integer('unit_cents').notNullable();
      table
        .timestamp('created_at')
        .defaultTo(knex.fn.now())
        .notNullable();
    }
  );

  return knex.schema.alterTable(
    'pricing_constants',
    (table: Knex.CreateTableBuilder) => {
      table.integer('branded_labels_minimum_cents').notNullable();
      table.integer('branded_labels_minimum_units').notNullable();
      table.integer('branded_labels_additional_cents').notNullable();
    }
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('pricing_care_labels');

  return knex.schema.alterTable(
    'pricing_constants',
    (table: Knex.CreateTableBuilder) => {
      table.dropColumn('branded_labels_minimum_cents');
      table.dropColumn('branded_labels_minimum_units');
      table.dropColumn('branded_labels_additional_cents');
    }
  );
}
