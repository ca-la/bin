import * as ProductDesignStagesDAO from '../../dao/product-design-stages';
import * as StageTemplatesDAO from '../../dao/stage-templates';
import * as TaskEventsDAO from '../../dao/task-events';
import * as TaskTemplatesDAO from '../../dao/task-templates';
import CollaboratorsDAO = require('../../dao/collaborators');
import Collection = require('../../domain-objects/collection');
import CollectionsDAO = require('../../dao/collections');
import createDesignTasks from './index';
import createUser = require('../../test-helpers/create-user');
import ProductDesign = require('../../domain-objects/product-design');
import ProductDesignsDAO = require('../../dao/product-designs');
import StageTemplate from '../../domain-objects/stage-template';
import TaskTemplate from '../../domain-objects/task-template';
import User from '../../domain-objects/user';
import { CALA_ADMIN_USER_ID } from '../../config';
import { sandbox, test, Test } from '../../test-helpers/fresh';

async function createTemplates(): Promise<{
  stage1: StageTemplate,
  stage2: StageTemplate,
  tasks: TaskTemplate[]
}> {
  const stage1 = await StageTemplatesDAO.create({
    description: 'Designey Stuff',
    title: 'Stage 1'
  });

  const stage2 = await StageTemplatesDAO.create({
    description: 'Producey stuff',
    title: 'Stage 2'
  });

  const tasks = await Promise.all([
    TaskTemplatesDAO.create({
      assigneeRole: 'CALA',
      description: 'Do the design',
      designPhase: 'POST_CREATION',
      stageTemplateId: stage1.id,
      title: 'Task 1'
    }),
    TaskTemplatesDAO.create({
      assigneeRole: 'CALA',
      description: 'Make the stuff',
      designPhase: 'POST_APPROVAL',
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

async function createResources(): Promise<{
  user: User,
  design: ProductDesign,
  collection: Collection
}> {
  const { user } = await createUser({ withSession: false });
  const collection = await CollectionsDAO.create({
    createdBy: user.id,
    description: 'We out here',
    title: 'Season 1'
  });

  const design = await ProductDesignsDAO.create({
    description: 'Shirt',
    productType: 'Teeshirt',
    title: 'Tee',
    userId: user.id
  });

  await CollectionsDAO.moveDesign(collection.id, design.id);

  return {
    collection,
    design,
    user
  };
}

test('createDesignTasks creates POST_CREATION tasks', async (t: Test) => {
  const { collection, design } = await createResources();

  sandbox()
    .stub(CollaboratorsDAO, 'findByCollectionAndUser')
    .withArgs(collection.id, CALA_ADMIN_USER_ID)
    .resolves([]);

  await createTemplates();

  await createDesignTasks({
    designId: design.id,
    designPhase: 'POST_CREATION'
  });

  const tasks = await TaskEventsDAO.findByCollectionId(collection.id);
  t.equal(tasks.length, 1);
  t.equal(tasks[0].title, 'Task 1');

  const stages = await ProductDesignStagesDAO.findAllByDesignId(design.id);
  t.equal(stages.length, 2);
  t.equal(stages[0].title, 'Stage 1');
  t.equal(stages[1].title, 'Stage 2');
});

test('createDesignTasks creates POST_APPROVAL tasks', async (t: Test) => {
  const { collection, design } = await createResources();

  sandbox()
    .stub(CollaboratorsDAO, 'findByCollectionAndUser')
    .withArgs(collection.id, CALA_ADMIN_USER_ID)
    .resolves([]);

  await createTemplates();

  await createDesignTasks({
    designId: design.id,
    designPhase: 'POST_CREATION'
  });

  await createDesignTasks({
    designId: design.id,
    designPhase: 'POST_APPROVAL'
  });

  const tasks = await TaskEventsDAO.findByCollectionId(collection.id);
  t.equal(tasks.length, 2);
  t.equal(tasks[0].title, 'Task 1');
  t.equal(tasks[1].title, 'Task 2');

  const stages = await ProductDesignStagesDAO.findAllByDesignId(design.id);
  t.equal(stages.length, 2);
  t.equal(stages[0].title, 'Stage 1');
  t.equal(stages[1].title, 'Stage 2');
});
