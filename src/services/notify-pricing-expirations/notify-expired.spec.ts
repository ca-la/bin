import * as Knex from 'knex';

import { sandbox, test, Test } from '../../test-helpers/fresh';

import * as db from '../../services/db';
import {
  notifyExpired,
  notifyOneWeekFromExpiring,
  notifyTwoDaysFromExpiring
} from './notify-expired';
import * as StatusService from '../../components/collections/services/determine-submission-status';
import * as CollectionsDAO from '../../components/collections/dao';
import * as NotificationService from '../create-notifications/costing-expirations';

test('notifyExpired works on the base case', async (t: Test) => {
  const findAllStub = sandbox()
    .stub(CollectionsDAO, 'findAllUnnotifiedCollectionsWithExpiringCostInputs')
    .resolves([]);

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      const result = await notifyExpired(trx);
      t.equal(result, 0);
      t.equal(findAllStub.callCount, 1);
    }
  );
});

test('notifyExpired works on the +1 case', async (t: Test) => {
  const findAllStub = sandbox()
    .stub(CollectionsDAO, 'findAllUnnotifiedCollectionsWithExpiringCostInputs')
    .resolves([
      { createdBy: 'user-one', id: 'collection-one' },
      { createdBy: 'user-two', id: 'collection-two' }
    ]);
  const determineStub = sandbox()
    .stub(StatusService, 'determineSubmissionStatus')
    .resolves({
      'collection-one': {
        isSubmitted: false,
        isCosted: false,
        isQuoted: false,
        isPaired: false
      },
      'collection-two': {
        isSubmitted: true,
        isCosted: true,
        isQuoted: true,
        isPaired: false
      }
    });
  const notifyStub = sandbox()
    .stub(NotificationService, 'immediatelySendCostingExpiredNotification')
    .resolves();

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      const result = await notifyExpired(trx);
      t.equal(result, 1);

      t.equal(findAllStub.callCount, 1);
      t.equal(determineStub.callCount, 1);
      t.deepEqual(determineStub.args[0][0], [
        'collection-one',
        'collection-two'
      ]);
      t.equal(notifyStub.callCount, 1);
      t.deepEqual(notifyStub.args[0][0], {
        collectionId: 'collection-one',
        recipientUserId: 'user-one'
      });
    }
  );
});

test('notifyOneWeekFromExpiring works on the base case', async (t: Test) => {
  const findAllStub = sandbox()
    .stub(CollectionsDAO, 'findAllUnnotifiedCollectionsWithExpiringCostInputs')
    .resolves([]);

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      const result = await notifyOneWeekFromExpiring(trx);
      t.equal(result, 0);
      t.equal(findAllStub.callCount, 1);
    }
  );
});

test('notifyOneWeekFromExpiring works on the +1 case', async (t: Test) => {
  const findAllStub = sandbox()
    .stub(CollectionsDAO, 'findAllUnnotifiedCollectionsWithExpiringCostInputs')
    .resolves([
      { createdBy: 'user-one', id: 'collection-one' },
      { createdBy: 'user-two', id: 'collection-two' }
    ]);
  const determineStub = sandbox()
    .stub(StatusService, 'determineSubmissionStatus')
    .resolves({
      'collection-one': {
        isSubmitted: true,
        isCosted: true,
        isQuoted: false,
        isPaired: false
      },
      'collection-two': {
        isSubmitted: true,
        isCosted: true,
        isQuoted: false,
        isPaired: false
      }
    });
  const notifyStub = sandbox()
    .stub(
      NotificationService,
      'immediatelySendOneWeekCostingExpirationNotification'
    )
    .resolves();

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      const result = await notifyOneWeekFromExpiring(trx);
      t.equal(result, 2);

      t.equal(findAllStub.callCount, 1);
      t.equal(determineStub.callCount, 1);
      t.deepEqual(determineStub.args[0][0], [
        'collection-one',
        'collection-two'
      ]);
      t.equal(notifyStub.callCount, 2);
    }
  );
});

test('notifyTwoDaysFromExpiring works on the base case', async (t: Test) => {
  const findAllStub = sandbox()
    .stub(CollectionsDAO, 'findAllUnnotifiedCollectionsWithExpiringCostInputs')
    .resolves([]);

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      const result = await notifyTwoDaysFromExpiring(trx);
      t.equal(result, 0);
      t.equal(findAllStub.callCount, 1);
    }
  );
});

test('notifyTwoDaysFromExpiring works on the +1 case', async (t: Test) => {
  const findAllStub = sandbox()
    .stub(CollectionsDAO, 'findAllUnnotifiedCollectionsWithExpiringCostInputs')
    .resolves([
      { createdBy: 'user-one', id: 'collection-one' },
      { createdBy: 'user-two', id: 'collection-two' },
      { createdBy: 'user-three', id: 'collection-three' }
    ]);
  const determineStub = sandbox()
    .stub(StatusService, 'determineSubmissionStatus')
    .resolves({
      'collection-one': {
        isSubmitted: true,
        isCosted: true,
        isQuoted: false,
        isPaired: false
      },
      'collection-two': {
        isSubmitted: true,
        isCosted: true,
        isQuoted: false,
        isPaired: false
      },
      'collection-three': {
        isSubmitted: true,
        isCosted: true,
        isQuoted: false,
        isPaired: false
      }
    });
  const notifyStub = sandbox()
    .stub(
      NotificationService,
      'immediatelySendTwoDayCostingExpirationNotification'
    )
    .resolves();

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      const result = await notifyTwoDaysFromExpiring(trx);
      t.equal(result, 3);

      t.equal(findAllStub.callCount, 1);
      t.equal(determineStub.callCount, 1);
      t.deepEqual(determineStub.args[0][0], [
        'collection-one',
        'collection-two',
        'collection-three'
      ]);
      t.equal(notifyStub.callCount, 3);
    }
  );
});
