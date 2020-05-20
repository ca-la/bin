import uuid from "node-uuid";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import EmailService from "../../services/email";
import * as UsersDAO from "../../components/users/dao";

import { immediatelySendMonthlySalesReport } from "./monthly-sales-report";
import MonthlySalesReport from "../../components/sales-reports/domain-object";

test("immediatelySendMonthlySalaesReport sends an email notification", async (t: Test) => {
  const emailStub = sandbox().stub(EmailService, "enqueueSend").resolves();
  const findStub = sandbox().stub(UsersDAO, "findById").resolves({});

  const report: MonthlySalesReport = {
    id: uuid.v4(),
    createdAt: new Date("2019-04-20"),
    createdBy: uuid.v4(),
    designerId: uuid.v4(),
    availableCreditCents: 200,
    costOfReturnedGoodsCents: 0,
    financingBalanceCents: 0,
    financingPrincipalPaidCents: 0,
    fulfillmentCostCents: 0,
    paidToDesignerCents: 900,
    revenueCents: 1000,
    revenueSharePercentage: 10,
  };

  await immediatelySendMonthlySalesReport(report);

  t.equal(findStub.callCount, 2);
  t.equal(emailStub.callCount, 1);
});
