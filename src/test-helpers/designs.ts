import * as Knex from 'knex';
import { deleteByIds } from '../components/product-designs/dao/dao';
import db = require('../services/db');

export async function deleteById(designId: string): Promise<void> {
  await db.transaction(async (trx: Knex.Transaction) => {
    await deleteByIds({ designIds: [designId], trx });
  });
}
