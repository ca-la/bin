import Knex from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(
    'pricing_inputs',
    (table: Knex.CreateTableBuilder) => {
      table.uuid('id').primary();
      table
        .timestamp('created_at')
        .notNullable()
        .defaultTo(knex.fn.now());

      table
        .uuid('constant_id')
        .references('id')
        .inTable('pricing_constants')
        .notNullable();
      table
        .uuid('margin_id')
        .references('id')
        .inTable('pricing_margins')
        .notNullable();
      table
        .uuid('product_material_id')
        .references('id')
        .inTable('pricing_product_materials')
        .notNullable();
      table
        .uuid('product_type_id')
        .references('id')
        .inTable('pricing_product_types')
        .notNullable();
      table
        .uuid('care_label_id')
        .references('id')
        .inTable('pricing_care_labels')
        .notNullable();

      table.unique([
        'constant_id',
        'margin_id',
        'product_material_id',
        'product_type_id',
        'care_label_id'
      ]);
    }
  );

  await knex.schema.createTable(
    'pricing_quotes',
    (table: Knex.CreateTableBuilder) => {
      table.uuid('id').primary();
      table
        .timestamp('created_at')
        .notNullable()
        .defaultTo(knex.fn.now());

      table
        .uuid('pricing_quote_input_id')
        .references('id')
        .inTable('pricing_inputs')
        .notNullable();

      table.text('product_type').notNullable();
      table.text('product_complexity').notNullable();
      table.text('material_category').notNullable();
      table.integer('material_budget_cents').unsigned();
      table.integer('units').unsigned();
      table
        .integer('base_cost_cents')
        .unsigned()
        .notNullable();
      table
        .integer('material_cost_cents')
        .unsigned()
        .notNullable();
      table
        .integer('process_cost_cents')
        .unsigned()
        .notNullable();
      table
        .integer('unit_cost_cents')
        .unsigned()
        .notNullable();
    }
  );

  await knex.schema.createTable(
    'pricing_quote_processes',
    (table: Knex.CreateTableBuilder) => {
      table.uuid('id').primary();
      table
        .timestamp('created_at')
        .notNullable()
        .defaultTo(knex.fn.now());

      table
        .uuid('pricing_quote_id')
        .references('id')
        .inTable('pricing_quotes')
        .notNullable();
      table
        .uuid('pricing_process_id')
        .references('id')
        .inTable('pricing_processes')
        .notNullable();

      table.unique(['pricing_quote_id', 'pricing_process_id']);
    }
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('pricing_quote_processes');
  await knex.schema.dropTable('pricing_quotes');
  await knex.schema.dropTable('pricing_inputs');
}
