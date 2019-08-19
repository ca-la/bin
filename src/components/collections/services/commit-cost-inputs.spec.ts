import { sandbox, test, Test } from '../../../test-helpers/fresh';
import * as DesignsDAO from '../../product-designs/dao';
import * as CostInputsDAO from '../../pricing-cost-inputs/dao';
import * as DesignEventsDAO from '../../../dao/design-events';
import * as NotificationsService from '../../../services/create-notifications';

import { commitCostInputs } from './commit-cost-inputs';

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
