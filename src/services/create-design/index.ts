import * as Knex from 'knex';
import * as db from '../db';

import CollaboratorsDAO = require('../../components/collaborators/dao');
import createDesignTasks from '../create-design-tasks';
import ProductDesign = require('../../domain-objects/product-design');
import ProductDesignsDAO = require('../../dao/product-designs');

async function createInTransaction(
  data: Unsaved<ProductDesign>,
  trx: Knex.Transaction
): Promise<ProductDesign> {
  const design = await ProductDesignsDAO.create(data, trx);

  await CollaboratorsDAO.create(
    {
      cancelledAt: null,
      collectionId: null,
      designId: design.id,
      invitationMessage: '',
      role: 'EDIT',
      userEmail: null,
      userId: design.userId
    },
    trx
  );

  await createDesignTasks(design.id, 'POST_CREATION', trx);

  return design;
}

async function createDesign(
  data: Unsaved<ProductDesign>,
  trx?: Knex.Transaction
): Promise<ProductDesign> {
  if (trx) {
    return createInTransaction(data, trx);
  }

  return db.transaction(
    (newTrx: Knex.Transaction): Promise<ProductDesign> =>
      createInTransaction(data, newTrx)
  );
}

export default createDesign;
