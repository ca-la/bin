import Knex from "knex";

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

  const byStripeSubscriptionId: Record<string, Invoice> = {};
  for (const invoice of stripeInvoices.data) {
    if (invoice.subscription) {
      byStripeSubscriptionId[invoice.subscription] = invoice;
    }
  }
  const stripeSubscriptionIds: string[] = Object.keys(byStripeSubscriptionId);

  const rows = await ReferralRedemptionsDAO.findByStripeSubscriptionIds(
    trx,
    stripeSubscriptionIds
  );

  let total = 0;
  for (const row of rows) {
    const invoice = byStripeSubscriptionId[row.stripe_subscription_id];
    if (!invoice) {
      throw new Error(
        `Could not find invoice for subscription #${row.stripe_subscription_id}`
      );
    }
    const creditDeltaCents = Math.floor(
      (invoice.total * REFERRING_USER_SUBSCRIPTION_SHARE_PERCENTS) / 100
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

  return total;
}
