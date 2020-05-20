import EmailService from "../email";
import * as StripeService from "../stripe";
import PartnerPayoutAccountsDAO from "../../dao/partner-payout-accounts";
import { PartnerPayoutLog } from "../../components/partner-payouts/domain-object";
import InvalidDataError = require("../../errors/invalid-data");
import { ADMIN_EMAIL } from "../../config";
import { findById as findUserById } from "../../components/users/dao";
import { create as createPartnerPayoutLog } from "../../components/partner-payouts/dao";
import { findById as findBidById } from "../../components/bids/dao";
import { findDesignByBidId } from "../../components/product-designs/dao/dao";

/**
 * Pay out a partner for some portion of their work, and send them an email
 * about it. Until the time when we have automatic payouts, this is a manual
 * process with a safeguard in place: we make sure the payout amount is <=
 * the invoice amount
 */
export async function payOutPartner(
  log: UninsertedWithoutShortId<PartnerPayoutLog>
): Promise<void> {
  const { bidId, payoutAccountId, payoutAmountCents, message, isManual } = log;
  if (!bidId) {
    throw new InvalidDataError("");
  }

  const bid = await findBidById(bidId);
  if (!bid) {
    throw new InvalidDataError(`No bid with ID ${bidId}`);
  }

  const design = await findDesignByBidId(bidId);
  if (!design) {
    throw new InvalidDataError(` ${bidId}`);
  }

  let vendorUser;
  if (!isManual) {
    const payoutAccount = await PartnerPayoutAccountsDAO.findById(
      payoutAccountId
    );
    if (!payoutAccount) {
      throw new InvalidDataError(
        `No payout account with ID ${payoutAccountId}`
      );
    }

    vendorUser = await findUserById(payoutAccount.userId);
    // Construct the Stripe transaction description to (a) make it clear what
    // they're being paid for, and (b) let use use the description as part of the
    // idempotency key, so that we can send different transfers with different
    // descriptions.
    const description = `${design.title}: ${message}`;

    // Send the transfer first; if it fails we don't send emails or create logs
    await StripeService.sendTransfer({
      destination: payoutAccount.stripeUserId,
      amountCents: payoutAmountCents,
      description,
      bidId,
      invoiceId: null,
    });
  }

  await createPartnerPayoutLog(log);

  // TODO: convert to `single_notification` template and construct a NotificationMessage.
  if (vendorUser) {
    await EmailService.enqueueSend({
      to: vendorUser.email,
      cc: ADMIN_EMAIL,
      templateName: "partner_payout",
      params: {
        payoutAmountCents,
        message,
      },
    });
  }
}
