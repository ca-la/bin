import * as uuid from 'node-uuid';
import * as Knex from 'knex';
import { flatten } from 'lodash';
import * as CollaboratorTasksDAO from '../../dao/collaborator-tasks';
import * as ProductDesignStagesDAO from '../../dao/product-design-stages';
import findCollaborators, { CollaboratorRole } from '../find-collaborators';
import Logger = require('../logger');
import { DetailsTask, TaskStatus } from '../../domain-objects/task-event';
import Collaborator from '../../components/collaborators/domain-objects/collaborator';
import {
  POST_APPROVAL_TEMPLATES,
  POST_CREATION_TEMPLATES,
  StageTemplate
} from '../../components/tasks/templates/stages';
import { TaskTemplate } from '../../components/tasks/templates/tasks';
import { DesignPhase } from '../../domain-objects/task-template';
import createTask from '../create-task';

type CollaboratorsByRole = { [role in CollaboratorRole]?: Collaborator[] };

async function createTasksFromTemplates(
  designId: string,
  taskTemplates: TaskTemplate[],
  stageId: string,
  trx?: Knex.Transaction
): Promise<DetailsTask[]> {
  // To avoid making the same "get collaborators by role" query for many tasks
  // in a row, cache old results as we iterate through the task template list
  const collaboratorsByRole: CollaboratorsByRole = {};

  async function getCollaborators(
    role: CollaboratorRole
  ): Promise<Collaborator[]> {
    let collaborators: Collaborator[];
    const cached = collaboratorsByRole[role];
    if (cached && cached.length > 0) {
      collaborators = cached;
    } else {
      collaborators = await findCollaborators(designId, role, trx);
    }
    return collaborators;
  }

  return Promise.all(
    taskTemplates.map(async (taskTemplate: TaskTemplate, index: number) => {
      const taskId = uuid.v4();
      const task = {
        createdBy: null,
        description: taskTemplate.description || '',
        designStageId: stageId,
        dueDate: null,
        ordering: index,
        status: TaskStatus.NOT_STARTED,
        taskId,
        title: taskTemplate.title
      };
      const taskEvent = await createTask(taskId, task, stageId, trx);

      const collaborators = await getCollaborators(
        taskTemplate.taskType.assigneeRole
      );

      if (collaborators.length > 0) {
        // Using first collaborator in each role for now - can reevaluate if/when
        // we have multiple for a given role
        await CollaboratorTasksDAO.createAllByCollaboratorIdsAndTaskId(
          [collaborators[0].id],
          taskId,
          trx
        );
      } else {
        // This is a non-fatal warning, but does indicate something wrong; either
        // the designer/CALA isn't shared on the collection, or we moved to
        // approval without a partner assigned.
        Logger.logServerError(
          `No matching collaborators with role ${
            taskTemplate.taskType.assigneeRole
          } are shared on design ${designId}`
        );
      }

      return taskEvent;
    })
  );
}

export default async function createDesignTasks(
  designId: string,
  designPhase: DesignPhase,
  trx?: Knex.Transaction
): Promise<DetailsTask[]> {
  const stageTemplates =
    designPhase === 'POST_CREATION'
      ? POST_CREATION_TEMPLATES
      : POST_APPROVAL_TEMPLATES;

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
