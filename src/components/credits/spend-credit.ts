import Knex from 'knex';

import { getCreditAmount, removeCredit } from './dao';
import Invoice = require('../../domain-objects/invoice');
import * as InvoicePaymentsDAO from '../invoice-payments/dao';

interface SpentResult {
  creditPaymentAmount: number;
  nonCreditPaymentAmount: number;
}

export default async function spendCredit(
  userId: string,
  invoice: Invoice,
  trx: Knex.Transaction
): Promise<SpentResult> {
  const availableCredit = await getCreditAmount(userId, trx);

  const creditPaymentAmount = Math.min(invoice.totalCents, availableCredit);
  const nonCreditPaymentAmount = invoice.totalCents - creditPaymentAmount;

  if (creditPaymentAmount > 0) {
    await InvoicePaymentsDAO.createTrx(trx, {
      creditUserId: userId,
      deletedAt: null,
      invoiceId: invoice.id,
      paymentMethodId: null,
      resolvePaymentId: null,
      rumbleshipPurchaseHash: null,
      stripeChargeId: null,
      totalCents: creditPaymentAmount
    });

    await removeCredit(
      {
        amountCents: creditPaymentAmount,
        createdBy: userId,
        description: `Spent credits on invoice ${invoice.id}`,
        givenTo: userId
      },
      trx
    );
  }

  return {
    creditPaymentAmount,
    nonCreditPaymentAmount
  };
}
