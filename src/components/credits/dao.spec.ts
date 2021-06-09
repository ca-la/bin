import Knex from "knex";

import db from "../../services/db";
import createUser = require("../../test-helpers/create-user");
import { CreditType, CreditsDAO } from ".";
import { sandbox, test, Test } from "../../test-helpers/fresh";

test("CreditsDAO supports adding & removing credits", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { user: otherUser } = await createUser({ withSession: false });

  await db.transaction(async (trx: Knex.Transaction) => {
    await CreditsDAO.create(trx, {
      type: CreditType.MANUAL,
      creditDeltaCents: 12300,
      createdBy: otherUser.id,
      description: "For being a good customer",
      expiresAt: null,
      givenTo: user.id,
      financingAccountId: null,
    });

    await CreditsDAO.create(trx, {
      type: CreditType.PROMO_CODE,
      creditDeltaCents: 999,
      createdBy: null,
      description: "promo code",
      expiresAt: null,
      givenTo: otherUser.id,
      financingAccountId: null,
    });

    await CreditsDAO.create(trx, {
      type: CreditType.REMOVE,
      creditDeltaCents: -300,
      createdBy: otherUser.id,
      description: "spending some money",
      expiresAt: null,
      givenTo: user.id,
      financingAccountId: null,
    });
  });

  const amount = await CreditsDAO.getCreditAmount(user.id);
  t.equal(amount, 12000);
});

test("CreditsDAO prevents you from removing more than available credits", async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  try {
    await db.transaction(async (trx: Knex.Transaction) => {
      await CreditsDAO.create(trx, {
        type: CreditType.MANUAL,
        creditDeltaCents: 123,
        createdBy: user.id,
        description: "For being a good customer",
        expiresAt: null,
        givenTo: user.id,
        financingAccountId: null,
      });

      await CreditsDAO.create(trx, {
        type: CreditType.REMOVE,
        creditDeltaCents: -223,
        createdBy: user.id,
        description: "spending some money",
        expiresAt: null,
        givenTo: user.id,
        financingAccountId: null,
      });
    });
    t.fail("Should not have completed transaction");
  } catch (err) {
    // tslint:disable-next-line:max-line-length
    t.equal(
      err.message,
      `Cannot remove 223 cents of credit from user ${user.id}; they only have 123 available`
    );
  }

  const amount = await CreditsDAO.getCreditAmount(user.id);
  t.equal(amount, 0);
});

test("CreditsDAO prevents you from removing with 0 credits", async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  try {
    await db.transaction(async (trx: Knex.Transaction) => {
      await CreditsDAO.create(trx, {
        type: CreditType.REMOVE,
        creditDeltaCents: -100,
        createdBy: user.id,
        description: "spending some money",
        expiresAt: null,
        givenTo: user.id,
        financingAccountId: null,
      });
    });
    t.fail("Should not have completed transaction");
  } catch (err) {
    // tslint:disable-next-line:max-line-length
    t.equal(
      err.message,
      `Cannot remove 100 cents of credit from user ${user.id}; they only have 0 available`
    );
  }

  const amount = await CreditsDAO.getCreditAmount(user.id);
  t.equal(amount, 0);
});

test("CreditsDAO prevents you from spending the same credits twice in parallel", async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  await db.transaction(async (trx: Knex.Transaction) => {
    await CreditsDAO.create(trx, {
      type: CreditType.MANUAL,
      creditDeltaCents: 500,
      createdBy: user.id,
      description: "For being a good customer",
      expiresAt: null,
      givenTo: user.id,
      financingAccountId: null,
    });
  });

  try {
    await Promise.all([
      db.transaction(async (trx: Knex.Transaction) => {
        await CreditsDAO.create(trx, {
          type: CreditType.REMOVE,
          creditDeltaCents: -400,
          createdBy: user.id,
          description: "spending some money",
          expiresAt: null,
          givenTo: user.id,
          financingAccountId: null,
        });
      }),
      db.transaction(async (trx: Knex.Transaction) => {
        await CreditsDAO.create(trx, {
          type: CreditType.REMOVE,
          creditDeltaCents: -400,
          createdBy: user.id,
          description: "spending some money",
          expiresAt: null,
          givenTo: user.id,
          financingAccountId: null,
        });
      }),
    ]);

    t.fail("Should not have completed transaction");
  } catch (err) {
    // tslint:disable-next-line:max-line-length
    t.equal(
      err.message,
      `Cannot remove 400 cents of credit from user ${user.id}; they only have 100 available`
    );
  }

  const amount = await CreditsDAO.getCreditAmount(user.id);
  t.equal(amount, 100);
});

test("CreditsDAO supports credit expiration", async (t: Test) => {
  const clock = sandbox().useFakeTimers();

  const { user } = await createUser({ withSession: false });

  await db.transaction(async (trx: Knex.Transaction) => {
    // Add 99c that never expires
    await CreditsDAO.create(trx, {
      type: CreditType.PROMO_CODE,
      creditDeltaCents: 99,
      createdBy: null,
      description: "Cool",
      expiresAt: null,
      givenTo: user.id,
      financingAccountId: null,
    });

    // Add $5 of expired credit
    await CreditsDAO.create(trx, {
      type: CreditType.PROMO_CODE,
      creditDeltaCents: 500,
      createdBy: null,
      description: "Cool",
      expiresAt: new Date(Date.now() - 1),
      givenTo: user.id,
      financingAccountId: null,
    });

    // Add $10 of credit that expires soon
    await CreditsDAO.create(trx, {
      type: CreditType.PROMO_CODE,
      creditDeltaCents: 1000,
      createdBy: null,
      description: "Cooler",
      expiresAt: new Date(Date.now() + 1000),
      givenTo: user.id,
      financingAccountId: null,
    });

    // Spend $2
    await CreditsDAO.create(trx, {
      type: CreditType.REMOVE,
      creditDeltaCents: -200,
      createdBy: user.id,
      description: "spending some money",
      expiresAt: null,
      givenTo: user.id,
      financingAccountId: null,
    });
  });

  // As of right now, we should have $8.99 available
  t.equal(await CreditsDAO.getCreditAmount(user.id), 899);

  // Fast forward the clocks
  clock.tick(1001);

  // We should be back to 99c available
  t.equal(await CreditsDAO.getCreditAmount(user.id), 99);
});

test("CreditsDAO subtracts from the soonest-expiring credits first", async (t: Test) => {
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

    await CreditsDAO.create(trx, {
      type: CreditType.PROMO_CODE,
      creditDeltaCents: 2000,
      createdBy: null,
      description: "Credit A",
      expiresAt: new Date(Date.now() + 4000),
      givenTo: user.id,
      financingAccountId: null,
    });

    clock.tick(500); // To 1.5k (checkpoint V)

    t.equal(await CreditsDAO.getCreditAmount(user.id, trx), 2000);

    clock.tick(500); // To 2k

    await CreditsDAO.create(trx, {
      type: CreditType.PROMO_CODE,
      creditDeltaCents: 3300,
      createdBy: null,
      description: "Credit B",
      expiresAt: new Date(Date.now() + 2000),
      givenTo: user.id,
      financingAccountId: null,
    });

    clock.tick(500); // To 2.5k

    t.equal(await CreditsDAO.getCreditAmount(user.id, trx), 5300);

    clock.tick(500); // To 3k

    await CreditsDAO.create(trx, {
      type: CreditType.REMOVE,
      creditDeltaCents: -4000,
      createdBy: user.id,
      description: "Spending",
      expiresAt: null,
      givenTo: user.id,
      financingAccountId: null,
    });

    clock.tick(500); // To 3.5k

    t.equal(await CreditsDAO.getCreditAmount(user.id, trx), 1300);

    clock.tick(1000); // To 4.5k

    t.equal(await CreditsDAO.getCreditAmount(user.id, trx), 1300);

    clock.tick(1000); // To 5.5k

    t.equal(await CreditsDAO.getCreditAmount(user.id, trx), 0);
  });
});
