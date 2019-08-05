import * as Knex from 'knex';
import Collaborator from '../../components/collaborators/domain-objects/collaborator';
import * as CollaboratorsDAO from '../../components/collaborators/dao';
import ProductDesignsDAO = require('../../dao/product-designs');
import { CALA_OPS_USER_ID } from '../../config';
import { taskTypes } from '../../components/tasks/templates/tasks';

export interface TaskTypeCollaborators {
  [id: string]: Collaborator[] | undefined;
}

export default async function findTaskTypeCollaborators(
  designId: string,
  trx: Knex.Transaction
): Promise<TaskTypeCollaborators> {
  const design = await ProductDesignsDAO.findById(
    designId,
    undefined,
    undefined,
    trx
  );
  if (!design) {
    throw new Error(`Could not find design with ID ${designId}`);
  }
  const designer = await CollaboratorsDAO.findByDesignAndUser(
    design.id,
    design.userId,
    trx
  );

  const CALA =
    design.collectionIds.length > 0
      ? await CollaboratorsDAO.findByCollectionAndUser(
          design.collectionIds[0],
          CALA_OPS_USER_ID,
          trx
        )
      : [];
  const DESIGN = designer ? [designer] : [];
  const PRODUCTION = await CollaboratorsDAO.findByDesignAndTaskType(
    design.id,
    taskTypes.PRODUCTION.id,
    trx
  );
  const TECHNICAL_DESIGN = await CollaboratorsDAO.findByDesignAndTaskType(
    design.id,
    taskTypes.TECHNICAL_DESIGN.id,
    trx
  );

  return {
    [taskTypes.CALA.id]: CALA,
    [taskTypes.DESIGN.id]: DESIGN,
    [taskTypes.PRODUCTION.id]: PRODUCTION,
    [taskTypes.TECHNICAL_DESIGN.id]: TECHNICAL_DESIGN
  };
}
