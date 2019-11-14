import uuid from 'node-uuid';

import { test, Test } from '../../../test-helpers/fresh';
import { isFinanced } from './is-financed';
import { InvoicePayment } from '../../invoice-payments/domain-object';

test('isFinanced can determine if a list of payments against an invoice were financed', async (t: Test) => {
  const result1 = isFinanced(0, []);
  t.true(result1, 'If there are no payments, it was financed');

  const result2 = isFinanced(1, []);
  t.true(
    result2,
    'If there are no payments for a non-zero balanced, it was financed'
  );

  const payment1: InvoicePayment = {
    createdAt: new Date(),
    creditUserId: null,
    deletedAt: null,
    id: uuid.v4(),
    invoiceId: uuid.v4(),
    paymentMethodId: uuid.v4(),
    stripeChargeId: 'abc-123',
    rumbleshipPurchaseHash: null,
    resolvePaymentId: null,
    totalCents: 1000
  };
  const payments: InvoicePayment[] = [payment1];
  const result3 = isFinanced(1000, payments);
  t.false(
    result3,
    'If there are only stripe payments that accumulate to the invocie total, it was not financed'
  );

  const result4 = isFinanced(1001, payments);
  t.true(
    result4,
    'If there are only stripe payments that do not accumulate to the invocie total, it was financed'
  );

  const payment2: InvoicePayment = {
    createdAt: new Date(),
    creditUserId: null,
    deletedAt: null,
    id: uuid.v4(),
    invoiceId: uuid.v4(),
    paymentMethodId: null,
    stripeChargeId: null,
    rumbleshipPurchaseHash: null,
    resolvePaymentId: uuid.v4(),
    totalCents: 1000
  };
  const payments2: InvoicePayment[] = [payment1, payment2];
  const result5 = isFinanced(1500, payments2);
  t.true(
    result5,
    'If there is at least one non-stripe payment, it was financed'
  );
});
