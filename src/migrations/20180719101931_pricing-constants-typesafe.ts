import * as Knex from 'knex';

export function up(knex: Knex): Knex.SchemaBuilder {
  return knex.schema
    .createTable('pricing_processes', (table: Knex.CreateTableBuilder): void => {
      table.uuid('id').primary();
      table.integer('version').notNullable();
      table.text('name').notNullable();
      table.integer('minimum_units').notNullable();
      table.text('complexity').notNullable();
      table.integer('setup_cents').notNullable();
      table.integer('unit_cents').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    })
    .createTable('pricing_product_types', (table: Knex.CreateTableBuilder): void => {
      table.uuid('id').primary();
      table.integer('version').notNullable();
      table.text('name').notNullable();
      table.integer('minimum_units').notNullable();
      table.text('complexity').notNullable();
      table.integer('unit_cents').notNullable();
      table.decimal('yield', null).notNullable();
      table.decimal('contrast', null).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    })
    .createTable('pricing_product_materials', (table: Knex.CreateTableBuilder): void => {
      table.uuid('id').primary();
      table.integer('version').notNullable();
      table.text('name').notNullable();
      table.integer('minimum_units').notNullable();
      table.text('category').notNullable();
      table.integer('unit_cents').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    })
    .createTable('pricing_constants', (table: Knex.CreateTableBuilder): void => {
      table.uuid('id').primary();
      table.integer('working_session_cents').notNullable();
      table.integer('technical_design_cents').notNullable();
      table.integer('pattern_cents').notNullable();
      table.integer('pattern_revision_cents').notNullable();
      table.integer('grading_cents').notNullable();
      table.integer('marking_cents').notNullable();
      table.integer('sample_minimum_cents').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    })
    .createTable('pricing_margins', (table: Knex.CreateTableBuilder): void => {
      table.uuid('id').primary();
      table.integer('version').notNullable();
      table.integer('minimum_units').notNullable();
      table.decimal('margin', null).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    });
}

export function down(knex: Knex): Knex.SchemaBuilder {
  return knex.schema
    .dropTable('pricing_processes')
    .dropTable('pricing_product_types')
    .dropTable('pricing_product_materials')
    .dropTable('pricing_constants')
    .dropTable('pricing_margins');
}
