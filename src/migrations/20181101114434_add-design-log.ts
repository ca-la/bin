import * as Knex from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('design_events', (table: Knex.TableBuilder) => {
    table.uuid('id').primary();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.uuid('actor_id').references('id').inTable('users').notNullable();
    table.uuid('target_id').references('id').inTable('users');
    table.uuid('design_id').references('id').inTable('product_designs').notNullable();
    table.text('type').notNullable();

    table.index(['target_id']);
    table.index(['design_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('design_events');
}
