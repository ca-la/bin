import uuid from "node-uuid";
import Knex from "knex";
import { omit } from "lodash";

import { test, Test } from "../../test-helpers/fresh";
import * as SalesReportsDAO from "./dao";
import db from "../../services/db";
import createUser = require("../../test-helpers/create-user");
import MonthlySalesReport from "./domain-object";

test("SalesReportsDAO supports creation", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { user: user2 } = await createUser({ withSession: false });

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      const body: MonthlySalesReport = {
        id: uuid.v4(),
        createdAt: new Date(),
        createdBy: user.id,
        designerId: user2.id,
        availableCreditCents: 100,
        costOfReturnedGoodsCents: 0,
        financingBalanceCents: 1000,
        financingPrincipalPaidCents: 100,
        fulfillmentCostCents: 0,
        paidToDesignerCents: 10,
        revenueCents: 100,
        revenueSharePercentage: 90,
      };
      const result = await SalesReportsDAO.create(body, trx);
      const foundResult = await SalesReportsDAO.findById(body.id, trx);

      t.deepEqual(omit(result, "createdAt"), omit(body, "createdAt"));
      t.deepEqual(result, foundResult);
    }
  );
});
