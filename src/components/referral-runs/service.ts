import Knex from "knex";
import uuid from "node-uuid";

import ReferralRunsDAO from "./dao";
import { CreditsDAO, CreditType } from "../credits";
import { REFERRAL_RUNS_FALLBACK_STRIPE_INVOICE_ID } from "../../config";
import {
  ReferralRedemptionsDAO,
  REFERRING_USER_SUBSCRIPTION_SHARE_PERCENTS,
} from "../referral-redemptions";

import { getInvoicesAfterSpecified } from "../../services/stripe/api";
import { Invoice } from "../../services/stripe";

export async function addReferralSubscriptionBonuses(
  trx: Knex.Transaction
): Promise<number> {
  const latestRun = await ReferralRunsDAO.findOne(trx, {});
  const latestStripeInvoiceId = latestRun
    ? latestRun.latestStripeInvoiceId
    : REFERRAL_RUNS_FALLBACK_STRIPE_INVOICE_ID;

  const stripeInvoices = await getInvoicesAfterSpecified(latestStripeInvoiceId);
  if (stripeInvoices.data.length === 0) {
    return 0;
  }

  const byStripeSubscriptionId: Record<string, Invoice[]> = {};
  for (const invoice of stripeInvoices.data) {
    if (invoice.subscription) {
      if (!byStripeSubscriptionId[invoice.subscription]) {
        byStripeSubscriptionId[invoice.subscription] = [invoice];
      } else {
        byStripeSubscriptionId[invoice.subscription].push(invoice);
      }
    }
  }

  const stripeSubscriptionIds: string[] = Object.keys(byStripeSubscriptionId);
  const rows = await ReferralRedemptionsDAO.findByStripeSubscriptionIds(
    trx,
    stripeSubscriptionIds
  );

  let total = 0;
  for (const row of rows) {
    const actualBefore = new Date(row.created_at);
    actualBefore.setFullYear(actualBefore.getFullYear() + 1);

    const invoices = byStripeSubscriptionId[row.stripe_subscription_id];
    if (!invoices || invoices.length === 0) {
      throw new Error(
        `Could not find invoice for subscription #${row.stripe_subscription_id}`
      );
    }
    let invoicesTotal = 0;
    for (const invoice of invoices) {
      const invoiceCreatedAt = new Date(invoice.created * 1000);
      if (invoiceCreatedAt <= actualBefore) {
        invoicesTotal += invoice.total;
      }
    }
    const creditDeltaCents = Math.floor(
      (invoicesTotal * REFERRING_USER_SUBSCRIPTION_SHARE_PERCENTS) / 100
    );

    // invoice.total can be zero or less than 10
    // so floor(invoice.total * 0.1) === 0
    if (creditDeltaCents === 0) {
      continue;
    }
    total += creditDeltaCents;

    await CreditsDAO.create(trx, {
      type: CreditType.REFERRING_SUBSCRIPTION,
      createdBy: null,
      givenTo: row.referring_user_id,
      creditDeltaCents,
      description: "Referral subscription bonus",
      expiresAt: null,
    });
  }

  if (latestStripeInvoiceId !== stripeInvoices.data[0].id) {
    await ReferralRunsDAO.create(trx, {
      id: uuid.v4(),
      createdAt: new Date(),
      latestStripeInvoiceId: stripeInvoices.data[0].id,
    });
  }

  return total;
}
