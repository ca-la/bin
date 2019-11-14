import uuid from 'node-uuid';
import { omit } from 'lodash';

import { sandbox, test, Test } from '../../test-helpers/fresh';
import * as ReportsDAO from './dao';
import { authHeader, post } from '../../test-helpers/http';
import createUser = require('../../test-helpers/create-user');
import MonthlySalesReport from './domain-object';
import * as ReportEmail from '../../services/create-notifications/monthly-sales-report';

test('POST /sales-reports/monthly fails for non-admin accounts', async (t: Test) => {
  const reportStub = sandbox()
    .stub(ReportsDAO, 'create')
    .resolves({});
  const { session } = await createUser({ role: 'USER' });

  const [res] = await post('/sales-reports/monthly', {
    body: {},
    headers: authHeader(session.id)
  });

  t.equal(res.status, 403);
  t.equal(reportStub.callCount, 0);
});

test('POST /sales-reports/monthly creates a monthly sales report', async (t: Test) => {
  const { user: adminUser, session: adminSession } = await createUser({
    role: 'ADMIN'
  });
  const { user } = await createUser({ withSession: false });
  const report: MonthlySalesReport = {
    id: uuid.v4(),
    createdAt: new Date('2019-04-20'),
    createdBy: adminUser.id,
    designerId: user.id,
    availableCreditCents: 200,
    costOfReturnedGoodsCents: 0,
    financingBalanceCents: 0,
    financingPrincipalPaidCents: 0,
    fulfillmentCostCents: 0,
    paidToDesignerCents: 900,
    revenueCents: 1000,
    revenueSharePercentage: 10
  };

  const reportStub = sandbox()
    .stub(ReportsDAO, 'create')
    .resolves(report);
  const emailStub = sandbox()
    .stub(ReportEmail, 'immediatelySendMonthlySalesReport')
    .resolves();

  const [res, body] = await post('/sales-reports/monthly', {
    body: report,
    headers: authHeader(adminSession.id)
  });

  t.equal(res.status, 201);
  t.deepEqual(omit(body, 'createdAt'), omit(report, 'createdAt'));
  t.equal(reportStub.callCount, 1);
  t.equal(emailStub.callCount, 1);
});
