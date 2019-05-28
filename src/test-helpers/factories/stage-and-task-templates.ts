import * as StageTemplatesDAO from '../../dao/stage-templates';
import * as TaskTemplatesDAO from '../../dao/task-templates';

import StageTemplate from '../../domain-objects/stage-template';
import TaskTemplate from '../../domain-objects/task-template';

export async function createTemplates(): Promise<{
  stage1: StageTemplate;
  stage2: StageTemplate;
  tasks: TaskTemplate[];
}> {
  const stage1 = await StageTemplatesDAO.create({
    description: 'Designey Stuff',
    ordering: 0,
    title: 'Stage 1'
  });

  const stage2 = await StageTemplatesDAO.create({
    description: 'Producey stuff',
    ordering: 1,
    title: 'Stage 2'
  });

  const tasks = await Promise.all([
    TaskTemplatesDAO.create({
      assigneeRole: 'CALA',
      description: 'Do the design',
      designPhase: 'POST_CREATION',
      ordering: 0,
      stageTemplateId: stage1.id,
      title: 'Task 1'
    }),
    TaskTemplatesDAO.create({
      assigneeRole: 'CALA',
      description: 'Make the stuff',
      designPhase: 'POST_APPROVAL',
      ordering: 1,
      stageTemplateId: stage2.id,
      title: 'Task 2'
    })
  ]);

  return {
    stage1,
    stage2,
    tasks
  };
}
