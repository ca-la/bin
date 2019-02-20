import * as Knex from 'knex';

import * as db from '../../services/db';
import createUser = require('../../test-helpers/create-user');
import { addCredit, getCreditAmount, removeCredit } from './dao';
import { sandbox, test, Test } from '../../test-helpers/fresh';

test('CreditsDAO supports adding & removing credits', async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { user: otherUser } = await createUser({ withSession: false });

  await db.transaction(async (trx: Knex.Transaction) => {
    await addCredit({
      amountCents: 12300,
      createdBy: otherUser.id,
      description: 'For being a good customer',
      expiresAt: null,
      givenTo: user.id
    }, trx);

    await addCredit({
      amountCents: 999,
      createdBy: user.id,
      description: 'thanks you too',
      expiresAt: null,
      givenTo: otherUser.id
    }, trx);

    await removeCredit({
      amountCents: 300,
      createdBy: user.id,
      description: 'spending some money',
      givenTo: user.id
    }, trx);
  });

  const amount = await getCreditAmount(user.id);
  t.equal(amount, 12000);
});

test('CreditsDAO prevents you from removing more than available credits', async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  try {
    await db.transaction(async (trx: Knex.Transaction) => {
      await addCredit({
        amountCents: 123,
        createdBy: user.id,
        description: 'For being a good customer',
        expiresAt: null,
        givenTo: user.id
      }, trx);

      await removeCredit({
        amountCents: 223,
        createdBy: user.id,
        description: 'spending some money',
        givenTo: user.id
      }, trx);
    });
    t.fail('Should not have completed transaction');
  } catch (err) {
    // tslint:disable-next-line:max-line-length
    t.equal(err.message, `Cannot remove 223 cents of credit from user ${user.id}; they only have 123 available`);
  }

  const amount = await getCreditAmount(user.id);
  t.equal(amount, 0);
});

test('CreditsDAO prevents you from removing with 0 credits', async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  try {
    await db.transaction(async (trx: Knex.Transaction) => {
      await removeCredit({
        amountCents: 100,
        createdBy: user.id,
        description: 'spending some money',
        givenTo: user.id
      }, trx);
    });
    t.fail('Should not have completed transaction');
  } catch (err) {
    // tslint:disable-next-line:max-line-length
    t.equal(err.message, `Cannot remove 100 cents of credit from user ${user.id}; they only have 0 available`);
  }

  const amount = await getCreditAmount(user.id);
  t.equal(amount, 0);
});

test(
  'CreditsDAO prevents you from spending the same credits twice in parallel',
  async (t: Test) => {
    const { user } = await createUser({ withSession: false });

    await addCredit({
      amountCents: 500,
      createdBy: user.id,
      description: 'For being a good customer',
      expiresAt: null,
      givenTo: user.id
    });

    try {
      await Promise.all([
        db.transaction(async (trx: Knex.Transaction) => {
          await removeCredit({
            amountCents: 400,
            createdBy: user.id,
            description: 'spending some money',
            givenTo: user.id
          }, trx);
        }),
        db.transaction(async (trx: Knex.Transaction) => {
          await removeCredit({
            amountCents: 400,
            createdBy: user.id,
            description: 'spending some money',
            givenTo: user.id
          }, trx);
        })
      ]);

      t.fail('Should not have completed transaction');
    } catch (err) {
      // tslint:disable-next-line:max-line-length
      t.equal(err.message, `Cannot remove 400 cents of credit from user ${user.id}; they only have 100 available`);
    }

    const amount = await getCreditAmount(user.id);
    t.equal(amount, 100);
  }
);

test('CreditsDAO supports credit expiration', async (t: Test) => {
  const clock = sandbox().useFakeTimers();

  const { user } = await createUser({ withSession: false });

  await db.transaction(async (trx: Knex.Transaction) => {
    // Add 99c that never expires
    await addCredit({
      amountCents: 99,
      createdBy: user.id,
      description: 'Cool',
      expiresAt: null,
      givenTo: user.id
    }, trx);

    // Add $5 of expired credit
    await addCredit({
      amountCents: 500,
      createdBy: user.id,
      description: 'Cool',
      expiresAt: new Date(Date.now() - 1),
      givenTo: user.id
    }, trx);

    // Add $10 of credit that expires soon
    await addCredit({
      amountCents: 1000,
      createdBy: user.id,
      description: 'Cooler',
      expiresAt: new Date(Date.now() + 1000),
      givenTo: user.id
    }, trx);

    // Spend $2
    await removeCredit({
      amountCents: 200,
      createdBy: user.id,
      description: 'spending some money',
      givenTo: user.id
    }, trx);
  });

  // As of right now, we should have $8.99 available
  t.equal(await getCreditAmount(user.id), 899);

  // Fast forward the clocks
  clock.tick(1001);

  // We should be back to 99c available
  t.equal(await getCreditAmount(user.id), 99);
});

test('CreditsDAO subtracts from the soonest-expiring credits first', async (t: Test) => {
  // Sets up a timeline like so:
  //
  //           |---------------------------------------| Credit A ($20)
  //
  //                     |-------------------| Credit B ($33)
  //
  //                               * - spend $40
  //
  //                *V        *W        *X        *Y        *Z    - checkpoints
  //
  //
  // 0         1k        2k        3k        4k        5k        6k
  // |----|----|----|----|----|----|----|----|----|----|----|----| time
  //
  const clock = sandbox().useFakeTimers();

  const { user } = await createUser({ withSession: false });

  await db.transaction(async (trx: Knex.Transaction) => {
    clock.tick(1000); // Brings us to 1k

    await addCredit({
      amountCents: 2000,
      createdBy: user.id,
      description: 'Credit A',
      expiresAt: new Date(Date.now() + 4000),
      givenTo: user.id
    }, trx);

    clock.tick(500); // To 1.5k (checkpoint V)

    t.equal(await getCreditAmount(user.id, trx), 2000);

    clock.tick(500); // To 2k

    await addCredit({
      amountCents: 3300,
      createdBy: user.id,
      description: 'Credit B',
      expiresAt: new Date(Date.now() + 2000),
      givenTo: user.id
    }, trx);

    clock.tick(500); // To 2.5k

    t.equal(await getCreditAmount(user.id, trx), 5300);

    clock.tick(500); // To 3k

    await removeCredit({
      amountCents: 4000,
      createdBy: user.id,
      description: 'Spending',
      givenTo: user.id
    }, trx);

    clock.tick(500); // To 3.5k

    t.equal(await getCreditAmount(user.id, trx), 1300);

    clock.tick(1000); // To 4.5k

    t.equal(await getCreditAmount(user.id, trx), 1300);

    clock.tick(1000); // To 5.5k

    t.equal(await getCreditAmount(user.id, trx), 0);
  });
});
