import * as Knex from 'knex';

export function up(knex: Knex): Knex.SchemaBuilder {
  return knex.schema.alterTable(
    'task_events',
    (table: Knex.CreateTableBuilder) => {
      table
        .string('description')
        .notNullable()
        .defaultTo('');
    }
  );
}

export function down(knex: Knex): Knex.SchemaBuilder {
  return knex.schema.alterTable(
    'task_events',
    (table: Knex.CreateTableBuilder) => {
      table.dropColumn('description');
    }
  );
}
