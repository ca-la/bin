import Knex from 'knex';
import * as CollectionsDAO from '../../dao';
import * as CollectionDesignsDAO from '../../dao/design';
import db from '../../../../services/db';

export default function del(collectionId: string): Promise<void> {
  return db.transaction(async (trx: Knex.Transaction) => {
    await CollectionsDAO.deleteById(trx, collectionId);
    await CollectionDesignsDAO.removeAllDesigns(trx, collectionId);
  });
}
