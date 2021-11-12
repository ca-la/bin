import Knex from "knex";
import uuid from "node-uuid";

import createUser from "../../test-helpers/create-user";
import { generateTeam } from "../../test-helpers/factories/team";
import { test, Test, db } from "../../test-helpers/fresh";

import CreditsDAO from "../credits/dao";
import { CreditType } from "../credits/types";
import FinancingAccountsDAO from "./dao";

test("FinancingAccountsDAO.findActive", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { team } = await generateTeam(user.id);

  const financingAccount = await db.transaction((trx: Knex.Transaction) =>
    FinancingAccountsDAO.create(trx, {
      closedAt: null,
      createdAt: new Date(),
      creditLimitCents: 5_000_00,
      feeBasisPoints: 10_00,
      id: uuid.v4(),
      teamId: team.id,
      termLengthDays: 90,
    })
  );
  await db.transaction((trx: Knex.Transaction) =>
    CreditsDAO.createAll(trx, [
      {
        id: uuid.v4(),
        createdAt: new Date(),
        type: CreditType.REMOVE,
        createdBy: user.id,
        givenTo: null,
        financingAccountId: financingAccount.id,
        creditDeltaCents: -1_000_00,
        description: "Collection payment: c1",
        expiresAt: null,
      },
      {
        id: uuid.v4(),
        createdAt: new Date(),
        type: CreditType.REMOVE,
        createdBy: user.id,
        givenTo: null,
        financingAccountId: financingAccount.id,
        creditDeltaCents: -1_000_00,
        description: "Collection payment: c2",
        expiresAt: null,
      },
      {
        id: uuid.v4(),
        createdAt: new Date(),
        type: CreditType.MANUAL,
        createdBy: user.id,
        givenTo: null,
        financingAccountId: financingAccount.id,
        creditDeltaCents: 1_000_00,
        description: "Financing repayment: abc-123",
        expiresAt: null,
      },
    ])
  );

  const active = await FinancingAccountsDAO.findActive(db, { teamId: team.id });

  t.equal(active!.id, financingAccount.id, "returns the correct account");
  t.equal(
    active!.availableBalanceCents,
    5_000_00 - 1_000_00 - 1_000_00 + 1_000_00,
    "returns the correct balance"
  );
});
