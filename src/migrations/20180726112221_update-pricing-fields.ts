import Knex from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(
    'pricing_product_materials',
    (table: Knex.CreateTableBuilder) => {
      table.dropColumn('name');
    }
  );
  await knex.schema.alterTable(
    'pricing_constants',
    (table: Knex.CreateTableBuilder) => {
      table.dropColumn('pattern_cents');
    }
  );
  await knex.schema.alterTable(
    'pricing_product_types',
    (table: Knex.CreateTableBuilder) => {
      table.integer('pattern_minimum_cents');
    }
  );
  await knex('pricing_product_types').update({ pattern_minimum_cents: 0 });
  await knex.schema.alterTable(
    'pricing_product_types',
    (table: Knex.CreateTableBuilder) => {
      table
        .integer('pattern_minimum_cents')
        .notNullable()
        .alter();
    }
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(
    'pricing_product_materials',
    (table: Knex.CreateTableBuilder) => {
      table.text('name');
    }
  );
  await knex('pricing_product_materials').update({ name: '' });
  await knex.schema.alterTable(
    'pricing_product_materials',
    (table: Knex.CreateTableBuilder) => {
      table
        .text('name')
        .notNullable()
        .alter();
    }
  );
  await knex.schema.alterTable(
    'pricing_constants',
    (table: Knex.CreateTableBuilder) => {
      table.integer('pattern_cents');
    }
  );
  await knex('pricing_constants').update({ pattern_cents: 0 });
  await knex.schema.alterTable(
    'pricing_constants',
    (table: Knex.CreateTableBuilder) => {
      table
        .integer('pattern_cents')
        .notNullable()
        .alter();
    }
  );
  await knex.schema.alterTable(
    'pricing_product_types',
    (table: Knex.CreateTableBuilder) => {
      table.dropColumn('pattern_minimum_cents');
    }
  );
}
