'use strict';

const createUser = require('../../test-helpers/create-user');
const db = require('../../services/db');
const EmailService = require('../../services/email');
const InvoicesDAO = require('../../dao/invoices');
const ProductDesignsDAO = require('../../dao/product-designs');
const Rumbleship = require('./index');
const { test, sandbox } = require('../../test-helpers/fresh');

// Contains { b, s } claims
const SAMPLE_JWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJDQUxBIiwiaWF0IjoxNTI4MjI0MDY2LCJleHAiOjE1NTk3NjAwNjYsImF1ZCI6Ind3dy5leGFtcGxlLmNvbSIsInN1YiI6ImRldm9wc0BjYS5sYSIsInMiOiJzdXBwbGllcl8xMjMiLCJiIjoiYnV5ZXJfMTIzIn0.kKKitsWvzXlepsw873X89nGacrUr4zlXOwHo4Bqfmlk';

test('Rumbleship#confirmFullOrder calls Rumbleship with the correct total', async (t) => {
  sandbox().stub(EmailService, 'enqueueSend', () => Promise.resolve());

  const rs = new Rumbleship({
    apiKey: 'api_12345',
    apiBase: 'https://rumbleship.example.com'
  });

  sandbox().stub(rs, 'makeRequest', () => Promise.resolve({
    body: {},
    response: {
      headers: new Map([['authorization', SAMPLE_JWT]])
    }
  }));

  const { user } = await createUser({ withSession: false });

  const design = await ProductDesignsDAO.create({ userId: user.id });

  let invoice;

  await db.transaction(async (trx) => {
    invoice = await InvoicesDAO.createTrx(trx, {
      designId: design.id,
      totalCents: 1234,
      title: 'My First Invoice',
      designStatusId: 'NEEDS_DEVELOPMENT_PAYMENT'
    });
  });

  await rs.confirmFullOrder({
    feePercentage: 0.123,
    invoice,
    poToken: 'po_123',
    purchaseHash: 'purchase_123',
    userId: user.id
  });

  t.equal(rs.makeRequest.callCount, 3);

  const firstCallData = rs.makeRequest.firstCall.args[0];
  t.equal(firstCallData.path, '/purchase-orders/purchase_123/confirm-for-shipment');
  t.equal(firstCallData.data.total_cents, 1234 + 173);
});
