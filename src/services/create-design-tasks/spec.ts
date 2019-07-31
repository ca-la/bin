import * as uuid from 'node-uuid';
import * as Knex from 'knex';
import * as ProductDesignStagesDAO from '../../dao/product-design-stages';
import * as CollaboratorTasksDAO from '../../dao/collaborator-tasks';
import * as findCollaborators from '../../services/find-collaborators';
import * as CreateTaskService from '../../services/create-task';
import Collection from '../../domain-objects/collection';
import * as CollectionsDAO from '../../dao/collections';
import createDesignTasks, { retrieveStageTemplates } from './index';
import createUser = require('../../test-helpers/create-user');
import ProductDesign = require('../../domain-objects/product-design');
import ProductDesignsDAO = require('../../dao/product-designs');
import User from '../../components/users/domain-object';
import { sandbox, test, Test } from '../../test-helpers/fresh';
import createCollaborator from '../../test-helpers/factories/collaborator';
import Collaborator from '../../components/collaborators/domain-objects/collaborator';
import {
  POST_APPROVAL_TEMPLATES,
  POST_CREATION_TEMPLATES
} from '../../components/tasks/templates/stages';
import * as ProductTypesDAO from '../../components/pricing-product-types/dao';
import * as ProductTypeStagesDAO from '../../components/product-type-stages/dao';
import StageTemplate from '../../domain-objects/stage-template';

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

test('retrieveStageTemplates returns a list of stages for the given design and phase', async (t: Test) => {
  const designId = uuid.v4();
  const productTypeId = uuid.v4();
  const findTypeByDesignStub = sandbox()
    .stub(ProductTypesDAO, 'findByDesignId')
    .resolves({
      id: productTypeId,
      name: 'BACKPACK',
      complexity: 'BLANK'
    });
  const findStagesByTypeStub = sandbox()
    .stub(ProductTypeStagesDAO, 'findAllByProductType')
    .resolves([
      { stageTemplateId: '3a50af7c-1663-4a08-af15-7630faee69ef' },
      { stageTemplateId: 'fadd74b8-952e-448b-8eb4-c8f9c21f7500' }
    ]);

  const results1 = await retrieveStageTemplates(designId, 'POST_CREATION');
  t.deepEqual(results1, POST_CREATION_TEMPLATES);
  t.equal(findTypeByDesignStub.callCount, 0);
  t.equal(findStagesByTypeStub.callCount, 0);

  const results2 = await retrieveStageTemplates(designId, 'POST_APPROVAL');
  t.deepEqual(
    results2,
    POST_APPROVAL_TEMPLATES.filter(
      (template: StageTemplate): boolean => {
        return (
          template.id === '3a50af7c-1663-4a08-af15-7630faee69ef' ||
          template.id === 'fadd74b8-952e-448b-8eb4-c8f9c21f7500'
        );
      }
    )
  );
  t.equal(findTypeByDesignStub.callCount, 1);
  t.equal(findStagesByTypeStub.callCount, 1);
});

test('createDesignTasks creates POST_CREATION tasks', async (t: Test) => {
  const { collaborator, design } = await createResources();
  const mockTrx = {} as Knex.Transaction;
  const mockStage = { id: uuid.v4() };
  const mockTaskEvent = { id: uuid.v4() };
  const mockCollaboratorTask = {
    collaboratorId: collaborator.id,
    taskId: mockTaskEvent.id
  };

  sandbox()
    .stub(findCollaborators, 'default')
    .resolves([collaborator]);

  const stagesStub = sandbox()
    .stub(ProductDesignStagesDAO, 'create')
    .resolves(mockStage);
  const createTaskStub = sandbox()
    .stub(CreateTaskService, 'default')
    .resolves(mockTaskEvent);
  const collaboratorsTasksStub = sandbox()
    .stub(CollaboratorTasksDAO, 'createAllByCollaboratorIdsAndTaskId')
    .resolves(mockCollaboratorTask);

  await createDesignTasks(design.id, 'POST_CREATION', mockTrx);
  const firstStage = POST_CREATION_TEMPLATES[0];

  t.equal(
    stagesStub.callCount,
    POST_CREATION_TEMPLATES.length,
    'creates each stage'
  );
  t.ok(
    stagesStub.calledWith(
      {
        description: firstStage.description,
        designId: design.id,
        ordering: firstStage.ordering,
        title: firstStage.title
      },
      mockTrx
    ),
    'Creates the first stage'
  );
  t.ok(createTaskStub.called);
  t.ok(collaboratorsTasksStub.called, 'creates each collaborator task');
});
