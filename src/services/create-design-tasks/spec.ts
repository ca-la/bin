import * as uuid from 'node-uuid';
import * as Knex from 'knex';
import * as db from '../db';
import * as ProductDesignStagesDAO from '../../dao/product-design-stages';
import * as CollaboratorTasksDAO from '../../dao/collaborator-tasks';
import * as CreateTaskService from '../create-task';
import * as FindTaskTypeCollaborators from '../find-task-type-collaborators';
import Collection from '../../components/collections/domain-object';
import * as CollectionsDAO from '../../components/collections/dao';
import createDesignTasks from './index';
import createUser = require('../../test-helpers/create-user');
import ProductDesign = require('../../components/product-designs/domain-objects/product-design');
import ProductDesignsDAO = require('../../components/product-designs/dao');
import User from '../../components/users/domain-object';
import { sandbox, test, Test } from '../../test-helpers/fresh';
import createCollaborator from '../../test-helpers/factories/collaborator';
import Collaborator from '../../components/collaborators/domain-objects/collaborator';
import { getTemplatesFor, taskTypes } from '../../components/tasks/templates';

async function createResources(): Promise<{
  user: User;
  design: ProductDesign;
  collection: Collection;
  collaborator: Collaborator;
}> {
  const designer = await createUser({ withSession: false });
  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: designer.user.id,
    deletedAt: null,
    description: 'We out here',
    id: uuid.v4(),
    title: 'Season 1'
  });

  const design = await ProductDesignsDAO.create({
    description: 'Shirt',
    productType: 'Teeshirt',
    title: 'Tee',
    userId: designer.user.id
  });

  await CollectionsDAO.moveDesign(collection.id, design.id);
  const { collaborator } = await createCollaborator({
    collectionId: collection.id,
    role: 'EDIT',
    userId: designer.user.id
  });

  return {
    collaborator,
    collection,
    design,
    user: designer.user
  };
}

test('createDesignTasks creates POST_CREATION tasks', async (t: Test) => {
  const { collaborator, design } = await createResources();
  const mockStage = { id: uuid.v4() };
  const mockTaskEvent = { id: uuid.v4() };
  const mockCollaboratorTask = {
    collaboratorId: collaborator.id,
    taskId: mockTaskEvent.id
  };

  sandbox()
    .stub(FindTaskTypeCollaborators, 'default')
    .resolves({
      [taskTypes.CALA.id]: [collaborator],
      [taskTypes.DESIGN.id]: [collaborator],
      [taskTypes.PRODUCTION.id]: [collaborator],
      [taskTypes.TECHNICAL_DESIGN.id]: [collaborator],
      [taskTypes.PRODUCT_PHOTOGRAPHY.id]: [collaborator]
    });

  const stagesStub = sandbox()
    .stub(ProductDesignStagesDAO, 'create')
    .resolves(mockStage);
  const createTaskStub = sandbox()
    .stub(CreateTaskService, 'default')
    .resolves(mockTaskEvent);
  const collaboratorsTasksStub = sandbox()
    .stub(CollaboratorTasksDAO, 'createAllByCollaboratorIdsAndTaskId')
    .resolves(mockCollaboratorTask);

  return db.transaction(async (trx: Knex.Transaction) => {
    await createDesignTasks(design.id, 'POST_CREATION', trx);
    const stages = getTemplatesFor('POST_CREATION', 'BLANK');

    t.equal(stagesStub.callCount, stages.length, 'creates each stage');
    t.ok(
      stagesStub.calledWith({
        description: stages[0].description,
        designId: design.id,
        ordering: stages[0].ordering,
        title: stages[0].title
      }),
      'Creates the first stage'
    );
    t.ok(createTaskStub.called);
    t.ok(collaboratorsTasksStub.called, 'creates each collaborator task');
  });
});
