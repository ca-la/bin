import * as uuid from 'node-uuid';
import * as Knex from 'knex';
import { flatten } from 'lodash';

import * as CollaboratorTasksDAO from '../../dao/collaborator-tasks';
import * as ProductDesignStagesDAO from '../../dao/product-design-stages';
import findTaskTypeCollaborators from '../../services/find-task-type-collaborators';
import { DetailsTask, TaskStatus } from '../../domain-objects/task-event';
import {
  POST_APPROVAL_TEMPLATES,
  POST_CREATION_TEMPLATES,
  StageTemplate
} from '../../components/tasks/templates/stages';
import { TaskTemplate } from '../../components/tasks/templates/tasks';
import { DesignPhase } from '../../domain-objects/task-template';
import createTask from '../create-task';
import { findByDesignId as findProductTypeByDesignId } from '../../components/pricing-product-types/dao';
import { findAllByProductType } from '../../components/product-type-stages/dao';
import ProductTypeStage from '../../components/product-type-stages/domain-object';

async function createTasksFromTemplates(
  designId: string,
  taskTemplates: TaskTemplate[],
  stageId: string,
  trx: Knex.Transaction
): Promise<DetailsTask[]> {
  const collaboratorsByTaskType = await findTaskTypeCollaborators(
    designId,
    trx
  );

  const createdTasks: DetailsTask[] = [];
  for (const taskTemplate of taskTemplates) {
    const taskId = uuid.v4();
    const task = {
      createdBy: null,
      description: taskTemplate.description || '',
      designStageId: stageId,
      dueDate: null,
      ordering: taskTemplates.indexOf(taskTemplate),
      status: TaskStatus.NOT_STARTED,
      taskId,
      title: taskTemplate.title
    };
    const taskEvent = await createTask(taskId, task, stageId, trx);
    createdTasks.push(taskEvent);

    const collaborators = collaboratorsByTaskType[taskTemplate.taskType.id];

    if (collaborators && collaborators.length > 0) {
      // Using first collaborator in each role/task type for now - can reevaluate if/when
      // we have multiple for a given role/task type
      await CollaboratorTasksDAO.createAllByCollaboratorIdsAndTaskId(
        [collaborators[0].id],
        taskId,
        trx
      );
    }
  }

  return createdTasks;
}

/**
 * Returns a list of stage templates based off the phase and the specific design.
 */
export async function retrieveStageTemplates(
  designId: string,
  designPhase: DesignPhase
): Promise<StageTemplate[]> {
  if (designPhase === 'POST_CREATION') {
    return POST_CREATION_TEMPLATES;
  }

  const productType = await findProductTypeByDesignId(designId);
  if (!productType) {
    throw new Error(
      `Unable to find a PricingProductType for design "${designId}".`
    );
  }
  const productTypeStageTemplates = await findAllByProductType(productType.id);
  if (productTypeStageTemplates.length === 0) {
    throw new Error(
      `No stage templates were found for pricing product type ${
        productType.id
      }.`
    );
  }
  const productTypeStageTemplateIds = productTypeStageTemplates.map(
    (typeStage: ProductTypeStage): string => {
      return typeStage.stageTemplateId;
    }
  );

  return POST_APPROVAL_TEMPLATES.filter((template: StageTemplate) => {
    return productTypeStageTemplateIds.includes(template.id);
  });
}

export default async function createDesignTasks(
  designId: string,
  designPhase: DesignPhase,
  trx: Knex.Transaction
): Promise<DetailsTask[]> {
  const stageTemplates = await retrieveStageTemplates(designId, designPhase);

  const stageTasks = await Promise.all(
    stageTemplates.map(
      async (template: StageTemplate): Promise<DetailsTask[]> => {
        const stage = await ProductDesignStagesDAO.create(
          {
            description: template.description,
            designId,
            ordering: template.ordering,
            title: template.title
          },
          trx
        );

        return createTasksFromTemplates(
          designId,
          template.tasks,
          stage.id,
          trx
        );
      }
    )
  );

  return flatten(stageTasks);
}
