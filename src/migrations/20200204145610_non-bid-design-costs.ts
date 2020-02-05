import Knex from 'knex';

export function up(knex: Knex): Knex.SchemaBuilder {
  return knex.schema.createTable(
    'non_bid_design_costs',
    (table: Knex.CreateTableBuilder) => {
      table.uuid('id').primary();
      table.text('category').notNullable();
      table.text('note');
      table
        .uuid('design_id')
        .references('id')
        .inTable('product_designs');
      table
        .uuid('created_by')
        .references('id')
        .inTable('users');
      table
        .dateTime('created_at')
        .notNullable()
        .defaultTo(knex.fn.now());
      table.dateTime('deleted_at');
    }
  );
}

export function down(knex: Knex): Knex.SchemaBuilder {
  return knex.schema.dropTable('non_bid_design_costs');
}
