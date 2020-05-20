import Knex from "knex";
import { values } from "lodash";
import Collaborator from "../../components/collaborators/domain-objects/collaborator";
import * as CollaboratorsDAO from "../../components/collaborators/dao";
import ProductDesignsDAO = require("../../components/product-designs/dao");
import { CALA_OPS_USER_ID } from "../../config";
import {
  TaskType,
  taskTypes,
} from "../../components/tasks/templates/task-types";
import { CollaboratorRole } from "../../components/collaborators/domain-objects/role";

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

  const byTaskType: TaskTypeCollaborators = {
    [taskTypes.CALA.id]: CALA,
    [taskTypes.DESIGN.id]: DESIGN,
  };

  const partnerTypes = values(taskTypes).filter(
    (type: TaskType) => type.assigneeRole === CollaboratorRole.PARTNER
  );

  for (const partnerType of partnerTypes) {
    byTaskType[partnerType.id] = await CollaboratorsDAO.findByDesignAndTaskType(
      design.id,
      partnerType.id,
      trx
    );
  }

  return byTaskType;
}
