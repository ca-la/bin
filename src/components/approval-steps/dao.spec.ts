import Knex from 'knex';
import * as uuid from 'node-uuid';

import { sandbox, test, Test } from '../../test-helpers/fresh';
import { staticProductDesign } from '../../test-helpers/factories/product-design';
import * as ProductDesignsDAO from '../product-designs/dao';
import * as DesignEventsDAO from '../../dao/design-events';
import db from '../../services/db';
import ProductDesign from '../product-designs/domain-objects/product-design';

import ApprovalStep, {
  ApprovalStepState,
  ApprovalStepType
} from './domain-object';
import * as ApprovalStepsDAO from './dao';
import createUser from '../../test-helpers/create-user';

import { init as pubsubInit } from '../../services/pubsub';
import generateCollaborator from '../../test-helpers/factories/collaborator';

pubsubInit();

test('ApprovalStepsDAO can create multiple steps and retrieve by design', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const d1: ProductDesign = await ProductDesignsDAO.create(
    staticProductDesign({ id: 'd1', userId: user.id })
  );
  const d2: ProductDesign = await ProductDesignsDAO.create(
    staticProductDesign({ id: 'd2', userId: user.id })
  );

  const as1: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: 'Checkout',
    ordering: 0,
    designId: d1.id,
    reason: null,
    type: ApprovalStepType.CHECKOUT,
    collaboratorId: null,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null
  };
  const as2: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: 'Technical Design',
    ordering: 1,
    designId: d1.id,
    reason: null,
    type: ApprovalStepType.TECHNICAL_DESIGN,
    collaboratorId: null,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null
  };
  const as3: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: 'Checkout',
    ordering: 0,
    designId: d2.id,
    reason: null,
    type: ApprovalStepType.CHECKOUT,
    collaboratorId: null,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null
  };
  const as4: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: 'Technical Design',
    ordering: 1,
    designId: d2.id,
    reason: null,
    type: ApprovalStepType.TECHNICAL_DESIGN,
    collaboratorId: null,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null
  };

  const created = await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.createAll(trx, [as1, as2, as3, as4])
  );

  t.deepEqual(created, [as1, as2, as3, as4], 'returns inserted steps');

  const found = await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.findByDesign(trx, d1.id)
  );

  t.deepEqual(found, [as1, as2], 'returns steps by design');
});

test('ApprovalStepsDAO can retrieve by step id', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const d1: ProductDesign = await ProductDesignsDAO.create(
    staticProductDesign({ id: 'd1', userId: user.id })
  );
  const as1: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: 'Checkout',
    ordering: 0,
    designId: d1.id,
    reason: null,
    type: ApprovalStepType.CHECKOUT,
    collaboratorId: null,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null
  };

  await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.createAll(trx, [as1])
  );

  const found = await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.findById(trx, as1.id)
  );

  t.deepEqual(found, as1, 'returns steps by design');
});

test('ApprovalStepsDAO updates title', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const d1: ProductDesign = await ProductDesignsDAO.create(
    staticProductDesign({ id: 'd1', userId: user.id })
  );
  const as1: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: 'Checkout',
    ordering: 0,
    designId: d1.id,
    reason: null,
    type: ApprovalStepType.CHECKOUT,
    collaboratorId: null,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null
  };

  await db.transaction(async (trx: Knex.Transaction) => {
    await ApprovalStepsDAO.createAll(trx, [as1]);
    const { updated } = await ApprovalStepsDAO.update(trx, as1.id, {
      title: 'Checkout title'
    });

    t.deepEqual(
      updated,
      { ...as1, title: 'Checkout title' },
      'returns updated step'
    );

    const designEvents = await DesignEventsDAO.findApprovalStepEvents(
      trx,
      as1.designId,
      as1.id
    );
    t.is(designEvents.length, 0, 'no design events created on title change');
  });
});

test('ApprovalStepsDAO updates state', async (t: Test) => {
  const testDate = new Date(2012, 11, 23);
  sandbox().useFakeTimers(testDate);
  const { user } = await createUser({ withSession: false });
  const d1: ProductDesign = await ProductDesignsDAO.create(
    staticProductDesign({ id: 'd1', userId: user.id })
  );
  const as1: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: 'Checkout',
    ordering: 0,
    designId: d1.id,
    reason: null,
    type: ApprovalStepType.CHECKOUT,
    collaboratorId: null,
    createdAt: testDate,
    startedAt: null,
    completedAt: null
  };
  const as2: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: 'Technical Design',
    ordering: 1,
    designId: d1.id,
    reason: null,
    type: ApprovalStepType.TECHNICAL_DESIGN,
    collaboratorId: null,
    createdAt: testDate,
    startedAt: null,
    completedAt: null
  };

  await db.transaction(async (trx: Knex.Transaction) => {
    await ApprovalStepsDAO.createAll(trx, [as1, as2]);
    const { updated } = await ApprovalStepsDAO.update(trx, as1.id, {
      state: ApprovalStepState.COMPLETED
    });

    t.deepEqual(
      updated,
      {
        ...as1,
        state: ApprovalStepState.COMPLETED,
        startedAt: testDate,
        completedAt: testDate
      },
      'returns updated step'
    );

    const designEvents = await DesignEventsDAO.findApprovalStepEvents(
      trx,
      as1.designId,
      as1.id
    );
    t.is(designEvents.length, 0, 'no design events created on state change');

    const as2Updated = await ApprovalStepsDAO.findById(trx, as2.id);
    t.is(
      as2Updated!.state,
      ApprovalStepState.CURRENT,
      'next step is changed from UNSTARTED to CURRENT'
    );
    t.ok(updated.startedAt, 'sets the started at date');
  });
});

test('ApprovalStepsDAO updates collaboratorId', async (t: Test) => {
  const testDate = new Date(2012, 11, 23);
  sandbox().useFakeTimers(testDate);
  const { user } = await createUser({ withSession: false });
  const d1: ProductDesign = await ProductDesignsDAO.create(
    staticProductDesign({ id: 'd1', userId: user.id })
  );
  const { collaborator } = await generateCollaborator({
    userId: user.id,
    designId: d1.id
  });
  const as1: ApprovalStep = {
    state: ApprovalStepState.CURRENT,
    id: uuid.v4(),
    title: 'Checkout',
    ordering: 0,
    designId: d1.id,
    reason: null,
    type: ApprovalStepType.CHECKOUT,
    collaboratorId: null,
    createdAt: testDate,
    startedAt: testDate,
    completedAt: null
  };
  const as2: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: 'Technical Design',
    ordering: 1,
    designId: d1.id,
    reason: null,
    type: ApprovalStepType.TECHNICAL_DESIGN,
    collaboratorId: null,
    createdAt: testDate,
    startedAt: null,
    completedAt: null
  };

  await db.transaction(async (trx: Knex.Transaction) => {
    await ApprovalStepsDAO.createAll(trx, [as1, as2]);
    const { updated } = await ApprovalStepsDAO.update(trx, as1.id, {
      collaboratorId: collaborator.id
    });

    t.deepEqual(
      updated,
      {
        ...as1,
        collaboratorId: collaborator.id
      },
      'returns updated step'
    );
  });
});
