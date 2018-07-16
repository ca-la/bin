'use strict';

const createUser = require('../../test-helpers/create-user');
const { authHeader, get } = require('../../test-helpers/http');
const { test } = require('../../test-helpers/fresh');

test('GET /kpis returns realistic values for each number', async (t) => {
  const { session: adminSession } = await createUser({ role: 'ADMIN' });

  const [response, body] = await get('/kpis?startDate=1970-01-01&endDate=2050-01-01', {
    headers: authHeader(adminSession.id)
  });

  t.equal(response.status, 200);
  t.equal(body.userCount, 1);
  t.equal(body.partnerCount, 0);
  t.equal(body.productionPartnerCount, 0);
  t.equal(body.designCount, 0);
  t.equal(body.paidDesignCount, 0);
  t.equal(body.paidDesignerCount, 0);
  t.equal(body.submittedDesignCount, 0);
  t.equal(body.approvedDesignCount, 0);
  t.equal(body.inDevelopmentDesignCount, 0);
  t.equal(body.inProductionDesignCount, 0);
  t.equal(body.otherStatusDesignCount, 0);
  t.equal(body.paidInvoiceAmountCents, 0);
  t.equal(body.paidDevelopmentAmountCents, 0);
  t.equal(body.paidProductionAmountCents, 0);
});
