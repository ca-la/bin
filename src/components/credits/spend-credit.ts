import Knex from "knex";

import { CreditType } from "./types";
import CreditsDAO from "./dao";
import Invoice = require("../../domain-objects/invoice");
import * as InvoicePaymentsDAO from "../invoice-payments/dao";

interface SpentResult {
  creditPaymentAmount: number;
  nonCreditPaymentAmount: number;
}

export default async function spendCredit(
  creditPaymentAmount: number,
  userId: string,
  invoice: Invoice,
  trx: Knex.Transaction
): Promise<SpentResult> {
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
      totalCents: creditPaymentAmount,
    });

    await CreditsDAO.create(trx, {
      type: CreditType.REMOVE,
      createdBy: userId,
      givenTo: userId,
      creditDeltaCents: -creditPaymentAmount,
      description: `Spent credits on invoice ${invoice.id}`,
      expiresAt: null,
    });
  }

  return {
    creditPaymentAmount,
    nonCreditPaymentAmount,
  };
}
