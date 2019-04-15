import * as uuid from 'node-uuid';
import * as ProductDesignStagesDAO from '../../dao/product-design-stages';
import * as TaskEventsDAO from '../../dao/task-events';
import CollaboratorsDAO = require('../../components/collaborators/dao');
import Collection from '../../domain-objects/collection';
import * as CollectionsDAO from '../../dao/collections';
import { createDesignTasks } from './index';
import createUser = require('../../test-helpers/create-user');
import ProductDesign = require('../../domain-objects/product-design');
import ProductDesignsDAO = require('../../dao/product-designs');
import User from '../../components/users/domain-object';
import { CALA_OPS_USER_ID } from '../../config';
import { sandbox, test, Test } from '../../test-helpers/fresh';
import { createTemplates } from '../../test-helpers/factories/stage-and-task-templates';

async function createResources(): Promise<{
  user: User,
  design: ProductDesign,
  collection: Collection
}> {
  const { user } = await createUser({ withSession: false });
  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: 'We out here',
    id: uuid.v4(),
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
    .withArgs(collection.id, CALA_OPS_USER_ID)
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
    .withArgs(collection.id, CALA_OPS_USER_ID)
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
