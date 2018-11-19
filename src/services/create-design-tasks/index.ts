import * as CollaboratorTasksDAO from '../../dao/collaborator-tasks';
import * as ProductDesignStagesDAO from '../../dao/product-design-stages';
import * as ProductDesignStageTasksDAO from '../../dao/product-design-stage-tasks';
import * as StageTemplatesDAO from '../../dao/stage-templates';
import * as TaskEventsDAO from '../../dao/task-events';
import * as TasksDAO from '../../dao/tasks';
import * as TaskTemplatesDAO from '../../dao/task-templates';
import findCollaborators, { CollaboratorRole } from '../find-collaborators';
import Logger = require('../logger');
import ProductDesignStage from '../../domain-objects/product-design-stage';
import TaskEvent, { TaskStatus } from '../../domain-objects/task-event';
import TaskTemplate, { DesignPhase } from '../../domain-objects/task-template';
import { Collaborator } from '../../domain-objects/collaborator';
import StageTemplate from '../../domain-objects/stage-template';

interface Options {
  designId: string;
  designPhase: DesignPhase;
}

export default async function createDesignTasks(options: Options): Promise<TaskEvent[]> {
  switch (options.designPhase) {
    case 'POST_CREATION':
      return createPostCreationTasks(options);

    case 'POST_APPROVAL':
      return createPostApprovalTasks(options);
  }
}

type CollaboratorsByRole = { [role in CollaboratorRole]?: Collaborator[] };

async function createTasks(
  designId: string,
  taskTemplates: TaskTemplate[],
  stages: ProductDesignStage[]
): Promise<TaskEvent[]> {
  const tasks: TaskEvent[] = [];

  // To avoid making the same "get collaborators by role" query for many tasks
  // in a row, cache old results as we iterate through the task template list
  const collaboratorsByRole: CollaboratorsByRole = {};

  async function getCollaborators(role: CollaboratorRole): Promise<Collaborator[]> {
    let collaborators: Collaborator[];
    const cached = collaboratorsByRole[role];
    if (cached && cached.length > 0) {
      collaborators = cached;
    } else {
      collaborators = await findCollaborators(designId, role);
    }
    return collaborators;
  }

  for (const taskTemplate of taskTemplates) {
    const taskStage = stages.find(
      (stage: ProductDesignStage): boolean => stage.stageTemplateId === taskTemplate.stageTemplateId
    );

    if (!taskStage) {
      Logger.logServerError(
        `No matching stage on design ${designId} found for task template ${taskTemplate.title}`
      );

      continue;
    }

    // TODO: Consider wrapping all 3 records up into a 'create-task' service.
    const task = await TasksDAO.create();

    const taskEvent = await TaskEventsDAO.create({
      createdBy: null,
      description: taskTemplate.description || '',
      designStageId: taskStage.id,
      dueDate: null,
      ordering: taskTemplate.ordering,
      status: TaskStatus.NOT_STARTED,
      taskId: task.id,
      title: taskTemplate.title
    });

    const collaborators = await getCollaborators(taskTemplate.assigneeRole);

    await ProductDesignStageTasksDAO.create({
      designStageId: taskStage.id,
      taskId: task.id
    });

    if (collaborators.length > 0) {
      // Using first collaborator in each role for now - can reevaluate if/when
      // we have multiple for a given role
      await CollaboratorTasksDAO.createAllByCollaboratorIdsAndTaskId(
        [collaborators[0].id],
        task.id
      );
    } else {
      // This is a non-fatal warning, but does indicate something wrong; either
      // the designer/CALA isn't shared on the collection, or we moved to
      // approval without a partner assigned.
      //
      // tslint:disable-next-line:max-line-length
      Logger.logServerError(`No matching collaborators with role ${taskTemplate.assigneeRole} are shared on design ${designId}`);
    }

    tasks.push(taskEvent);
  }
  return tasks;
}

async function createPostCreationTasks(options: Options): Promise<TaskEvent[]> {
  const stageTemplates = await StageTemplatesDAO.findAll();
  const { designId, designPhase } = options;

  const stages: ProductDesignStage[] = await Promise.all(stageTemplates.map(
    (template: StageTemplate): Promise<ProductDesignStage> => {
      return ProductDesignStagesDAO.create({
        description: template.description,
        designId,
        ordering: template.ordering,
        stageTemplateId: template.id,
        title: template.title
      });
    }));
  const taskTemplates = await TaskTemplatesDAO.findByPhase(designPhase);

  return await createTasks(designId, taskTemplates, stages);
}

async function createPostApprovalTasks(options: Options): Promise<TaskEvent[]> {
  const { designId, designPhase } = options;
  const taskTemplates = await TaskTemplatesDAO.findByPhase(designPhase);

  const stages = await ProductDesignStagesDAO.findAllByDesignId(designId);

  return await createTasks(designId, taskTemplates, stages);
}
