import * as Knex from 'knex';

export function up(knex: Knex): Knex.SchemaBuilder {
  return knex.schema.alterTable(
    'pricing_constants',
    (table: Knex.CreateTableBuilder) => {
      table
        .integer('version')
        .notNullable()
        .defaultTo(0);
    }
  );
}

export function down(knex: Knex): Knex.SchemaBuilder {
  return knex.schema.alterTable(
    'pricing_constants',
    (table: Knex.CreateTableBuilder) => {
      table.dropColumn('version');
    }
  );
}
