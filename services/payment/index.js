'use strict';

async function payInvoice(invoiceId, paymentMethodId) {
  const updated = await Invoices.update(invoiceId, {
    paidAt: new Date(),
    paymentMethodId,
    stripeChargeId
  });
}
