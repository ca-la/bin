import * as Knex from 'knex';
import * as uuid from 'node-uuid';
import * as db from '../../services/db';
import { test, Test } from '../../test-helpers/fresh';
import generateBid from '../../test-helpers/factories/bid';
import * as BidTaskTypesDAO from './dao';
import { taskTypes } from '../tasks/templates';

test('BidTaskTypesDAO.create', async (t: Test) => {
  const { bid } = await generateBid();
  return db.transaction(async (trx: Knex.Transaction) => {
    const created = await BidTaskTypesDAO.create(
      {
        pricingBidId: bid.id,
        taskTypeId: taskTypes.TECHNICAL_DESIGN.id
      },
      trx
    );

    t.ok(created.id);
    t.equal(created.pricingBidId, bid.id);
    t.equal(created.taskTypeId, taskTypes.TECHNICAL_DESIGN.id);

    try {
      await BidTaskTypesDAO.create(
        {
          pricingBidId: uuid.v4(),
          taskTypeId: uuid.v4()
        },
        trx
      );
      t.fail('Creation succeeded with invalid foreign key');
    } catch (e) {
      t.pass('Creation failed with invalid foreign key');
    }
  });
});
