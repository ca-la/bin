import uuid from 'node-uuid';
import Knex from 'knex';

import * as CollaboratorTasksDAO from '../../dao/collaborator-tasks';
import * as ProductDesignStagesDAO from '../../dao/product-design-stages';
import findTaskTypeCollaborators from '../../services/find-task-type-collaborators';
import TaskEvent, { TaskStatus } from '../../domain-objects/task-event';
import { getTemplatesFor } from '../../components/tasks/templates';
import { TaskTemplate } from '../../components/tasks/templates/task-template';
import { StageTemplate } from '../../components/tasks/templates/stage-template';
import { DesignPhase } from '../../domain-objects/task-template';
import { createTasks } from '../create-task';
import { findByDesignId as findProductTypeByDesignId } from '../../components/pricing-product-types/dao';
import ProductDesignStage from '../../domain-objects/product-design-stage';

async function createTasksFromTemplates(
  designId: string,
  taskTemplates: { [stageId: string]: TaskTemplate[] },
  trx: Knex.Transaction
): Promise<TaskEvent[]> {
  const collaboratorsByTaskType = await findTaskTypeCollaborators(
    designId,
    trx
  );

  const collaboratorTasks: CollaboratorTasksDAO.CollaboratorsWithTaskId[] = [];
  const allTasks: Unsaved<TaskEvent>[] = [];

  for (const stageId of Object.keys(taskTemplates)) {
    const templates = taskTemplates[stageId];
    for (let i = 0; i < templates.length; i += 1) {
      const taskId = uuid.v4();
      const template = templates[i];

      const collaborators = collaboratorsByTaskType[template.taskType.id];
      if (collaborators && collaborators.length > 0) {
        collaboratorTasks.push({ taskId, collaborators });
      }

      allTasks.push({
        createdBy: null,
        description: template.description || '',
        designStageId: stageId,
        dueDate: null,
        ordering: i,
        status: TaskStatus.NOT_STARTED,
        taskId,
        title: template.title
      });
    }
  }

  const createdTasks = await createTasks(allTasks, trx);

  if (collaboratorTasks.length > 0) {
    await CollaboratorTasksDAO.createAll(collaboratorTasks, trx);
  }

  return createdTasks;
}

/**
 * Returns a list of stage templates based off the phase and the specific design.
 */
async function retrieveStageTemplates(
  designId: string,
  designPhase: DesignPhase
): Promise<StageTemplate[]> {
  if (designPhase === 'POST_CREATION') {
    // TODO Fix once we can tell upon creation what kind of design this is,
    return getTemplatesFor('POST_CREATION', 'BLANK');
  }

  const productType = await findProductTypeByDesignId(designId);
  if (!productType) {
    throw new Error(
      `Unable to find a PricingProductType for design "${designId}".`
    );
  }
  return getTemplatesFor(designPhase, productType.complexity);
}

async function createStages(
  stageTemplates: StageTemplate[],
  designId: string,
  trx: Knex.Transaction
): Promise<ProductDesignStage[]> {
  const allStages = stageTemplates.map(
    (template: StageTemplate): Unsaved<ProductDesignStage> => {
      return {
        description: template.description,
        designId,
        ordering: template.ordering,
        title: template.title
      };
    }
  );
  return ProductDesignStagesDAO.createAll(allStages, trx);
}

async function createAllTasks(
  stageTemplates: StageTemplate[],
  createdStages: ProductDesignStage[],
  designId: string,
  trx: Knex.Transaction
): Promise<TaskEvent[]> {
  const taskTemplatesByStageTitle: {
    [title: string]: TaskTemplate[];
  } = stageTemplates.reduce(
    (acc: { [title: string]: TaskTemplate[] }, template: StageTemplate) => {
      acc[template.title] = template.tasks;
      return acc;
    },
    {}
  );
  const allTasks = createdStages.reduce(
    (acc: { [stageId: string]: TaskTemplate[] }, stage: ProductDesignStage) => {
      acc[stage.id] = taskTemplatesByStageTitle[stage.title];
      return acc;
    },
    {}
  );
  return createTasksFromTemplates(designId, allTasks, trx);
}

export default async function createDesignTasks(
  designId: string,
  designPhase: DesignPhase,
  trx: Knex.Transaction
): Promise<TaskEvent[]> {
  const stageTemplates = await retrieveStageTemplates(designId, designPhase);
  if (stageTemplates.length === 0) {
    return [];
  }
  const createdStages = await createStages(stageTemplates, designId, trx);
  return createAllTasks(stageTemplates, createdStages, designId, trx);
}
