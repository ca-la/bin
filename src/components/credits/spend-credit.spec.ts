import Knex from "knex";

import db from "../../services/db";
import createUser from "../../test-helpers/create-user";
import generateInvoice from "../../test-helpers/factories/invoice";
import spendCredit from "./spend-credit";
import { CreditsDAO, CreditType } from ".";
import { test, Test } from "../../test-helpers/fresh";

test("spendCredit spends the available amount", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { invoice } = await generateInvoice();

  await db.transaction(async (trx: Knex.Transaction) => {
    await CreditsDAO.create(trx, {
      type: CreditType.PROMO_CODE,
      creditDeltaCents: 1230,
      createdBy: null,
      description: "For being a good customer",
      expiresAt: null,
      givenTo: user.id,
      financingAccountId: null,
    });

    const result = await spendCredit(1230, user.id, invoice, trx);

    t.equal(result.creditPaymentAmount, 1230);
    t.equal(result.nonCreditPaymentAmount, 4);
    t.equal(await CreditsDAO.getCreditAmount(user.id, trx), 0);
  });
});
