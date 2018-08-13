import * as Knex from 'knex';

export function up(knex: Knex): Knex.SchemaBuilder {
  return knex
    .schema
    .alterTable('pricing_quote_processes', (table: Knex.CreateTableBuilder) => {
      table.dropUnique(['pricing_quote_id', 'pricing_process_id']);
    });
}

export function down(knex: Knex): Knex.SchemaBuilder {
  return knex
    .schema
    .alterTable('pricing_quote_processes', (table: Knex.CreateTableBuilder) => {
      table.unique(['pricing_quote_id', 'pricing_process_id']);
    });
}
