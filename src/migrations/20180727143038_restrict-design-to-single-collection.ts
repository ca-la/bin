import Knex from 'knex';

export async function up(knex: Knex): Promise<any> {
  return knex.transaction(async (trx: Knex.Transaction) => {
    await trx({ cd1: 'collection_designs' })
      .whereExists(
        knex
          .select('design_id')
          .from({ cd2: 'collection_designs' })
          .whereRaw('"cd2"."created_at" > "cd1"."created_at"')
          .andWhereRaw('"cd2"."design_id" = "cd1"."design_id"')
      )
      .delete();

    return trx.schema.alterTable(
      'collection_designs',
      (table: Knex.CreateTableBuilder) => {
        table.dropPrimary();
        table.primary(['design_id']);
      }
    );
  });
}

export function down(knex: Knex): Knex.SchemaBuilder {
  return knex.schema.alterTable(
    'collection_designs',
    (table: Knex.CreateTableBuilder) => {
      table.dropPrimary();
      table.primary(['design_id', 'collection_id']);
    }
  );
}
