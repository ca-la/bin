import * as Knex from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('design_events', (table: Knex.TableBuilder) => {
    table.uuid('quote_id').references('id').inTable('pricing_quotes');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('design_events', (table: Knex.TableBuilder) => {
    table.dropColumn('quote_id');
  });
}
