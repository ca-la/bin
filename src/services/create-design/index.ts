import * as Knex from 'knex';
import CollaboratorsDAO = require('../../components/collaborators/dao');
import { createDesignTasks } from '../create-design-tasks';
import ProductDesign = require('../../domain-objects/product-design');
import ProductDesignsDAO = require('../../dao/product-designs');

async function createDesign(
  data: Unsaved<ProductDesign>,
  trx?: Knex.Transaction
): Promise<ProductDesign> {
  const design = await ProductDesignsDAO.create(data, trx);

  await CollaboratorsDAO.create({
    cancelledAt: null,
    collectionId: null,
    designId: design.id,
    invitationMessage: '',
    role: 'EDIT',
    userEmail: null,
    userId: design.userId
  }, trx);

  await createDesignTasks({
    designId: design.id,
    designPhase: 'POST_CREATION'
  }, trx);

  return design;
}

export default createDesign;
