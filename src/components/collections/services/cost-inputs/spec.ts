import { omit } from 'lodash';
import { sandbox, test, Test } from '../../../../test-helpers/fresh';
import DesignsDAO from '../../../product-designs/dao';
import * as DetermineSubmissionStatus from '../determine-submission-status';

import * as CostInputsDAO from '../../../pricing-cost-inputs/dao';
import * as DesignEventsDAO from '../../../../dao/design-events';
import * as NotificationsService from '../../../../services/create-notifications';
import { commitCostInputs, recostInputs } from '.';

test('commitCostInputs commits cost inputs', async (t: Test) => {
  const findByCollectionStub = sandbox()
    .stub(DesignsDAO, 'findByCollectionId')
    .resolves([
      { id: 'design-one' },
      { id: 'design-two' },
      { id: 'design-three' }
    ]);
  const expireStub = sandbox()
    .stub(CostInputsDAO, 'expireCostInputs')
    .resolves();
  const createEventStub = sandbox()
    .stub(DesignEventsDAO, 'create')
    .resolves();
  const notificationStub = sandbox()
    .stub(NotificationsService, 'immediatelySendFullyCostedCollection')
    .resolves();

  const testDate = new Date('2019-04-20');
  const futureDate = new Date('2019-05-04');
  const clock = sandbox().useFakeTimers(testDate);

  await commitCostInputs('collection-one', 'user-one');

  t.equal(findByCollectionStub.callCount, 1);
  t.deepEqual(findByCollectionStub.args[0], ['collection-one']);

  t.equal(expireStub.callCount, 1);
  t.deepEqual(
    expireStub.args[0][0],
    ['design-one', 'design-two', 'design-three'],
    'Passes through all the designs in the collection'
  );
  t.deepEqual(
    expireStub.args[0][1],
    futureDate,
    'Uses the time two weeks from now'
  );

  t.equal(createEventStub.callCount, 3);
  t.equal(notificationStub.callCount, 1);

  clock.reset();
});

test('recostInputs duplicates and commits inputs', async (t: Test) => {
  const MOCK_COST_INPUTS = [
    {
      createdAt: 2,
      materialBudgetCents: 2000
    },
    {
      createdAt: 3,
      materialBudgetCents: 5000
    },
    {
      createdAt: 1,
      materialBudgetCents: 1000
    }
  ];
  const getDesignsMetaByCollectionStub = sandbox()
    .stub(DetermineSubmissionStatus, 'getDesignsMetaByCollection')
    .resolves({
      ['collection-one']: [
        {
          id: 'design-one',
          costInputs: MOCK_COST_INPUTS
        }
      ]
    });

  const attachProcessesStub = sandbox()
    .stub(CostInputsDAO, 'attachProcesses')
    .resolves({
      ...MOCK_COST_INPUTS[1],
      processes: []
    });
  const createCostInputStub = sandbox()
    .stub(CostInputsDAO, 'create')
    .resolves();

  const testDate = new Date('2019-04-20');
  const clock = sandbox().useFakeTimers(testDate);

  await recostInputs('collection-one');

  t.equal(getDesignsMetaByCollectionStub.callCount, 1);
  t.deepEqual(
    getDesignsMetaByCollectionStub.args[0],
    [['collection-one']],
    'Calls getDesignsMetaByCollection with proper args'
  );

  t.equal(attachProcessesStub.callCount, 1);
  t.deepEqual(
    attachProcessesStub.args[0][0],
    MOCK_COST_INPUTS[1],
    'Calls attachProcesses with proper args'
  );

  t.equal(createCostInputStub.callCount, 1);
  t.deepEqual(
    omit(createCostInputStub.args[0][1], 'id'),
    {
      ...MOCK_COST_INPUTS[1],
      processes: [],
      createdAt: testDate,
      deletedAt: null,
      expiresAt: null
    },
    'Calls createCostInputStub with proper args'
  );

  clock.reset();
});
