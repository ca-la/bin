'use strict';

const { createInvoicesWithPayments } = require('../../test-helpers/factories/invoice-payments');
const Stripe = require('../stripe');
const EmailService = require('../email');
const SlackService = require('../slack');
const payInvoice = require('./index');
const { test, sandbox } = require('../../test-helpers/fresh');

test('payInvoice', async (t) => {
  sandbox().stub(Stripe, 'charge', () => Promise.resolve({ id: 'chargeId' }));
  sandbox().stub(EmailService, 'enqueueSend', () => Promise.resolve());
  sandbox().stub(SlackService, 'enqueueSend', () => Promise.resolve());

  const {
    designs,
    users,
    createdInvoices,
    paymentMethod
  } = await createInvoicesWithPayments();
  const unpaidInvoice = createdInvoices[2];

  const paidInvoice = await payInvoice(
    unpaidInvoice.id,
    paymentMethod.id,
    users[1].id
  );

  t.equal(
    EmailService.enqueueSend.firstCall.args[0].templateName,
    'update_design_status',
    'sends status update email'
  );
  t.ok(
    Stripe.charge.calledWith({
      customerId: paymentMethod.stripeCustomerId,
      sourceId: paymentMethod.stripeSourceId,
      amountCents: unpaidInvoice.totalCents,
      description: unpaidInvoice.title,
      invoiceId: unpaidInvoice.id
    }),
    'charged via Stripe'
  );
  t.ok(Stripe.charge.calledOnce, 'only charge once');

  t.ok(
    SlackService.enqueueSend.calledWith({
      channel: 'designers',
      templateName: 'designer_payment',
      params: {
        design: designs[1],
        designer: users[1],
        paymentAmountCents: unpaidInvoice.totalCents
      }
    }),
    'sent Slack notification'
  );
  t.ok(Stripe.charge.calledOnce, 'only notify once');

  t.ok(paidInvoice.isPaid, 'paid invoice is paid');
  t.equal(paidInvoice.totalPaid, unpaidInvoice.totalCents, 'total paid is total invoice due');
  t.ok(paidInvoice.paidAt, 'has a last paid at date');
});
