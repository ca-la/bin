'use strict';

const InvalidDataError = require('../../errors/invalid-data');
const InvoicesDAO = require('../../dao/invoices');
const PartnerPayoutAccountsDAO = require('../../dao/partner-payout-accounts');
const PartnerPayoutLogsDAO = require('../../dao/partner-payout-logs');
const UsersDAO = require('../../components/users/dao');
const EmailService = require('../email');
const { requireValues } = require('../require-properties');
const StripeService = require('../stripe');
const { ADMIN_EMAIL } = require('../../config');

function assert(val, message) {
  if (!val) {
    throw new InvalidDataError(message);
  }
}

// Pay out a partner for some portion of their work, and send them an email
// about it.
//
// Until the time when we have automatic payouts, this is a manual process with
// a safeguard in place: we make sure the payout amount is <= the invoice amount
async function payOutPartner({
  initiatorUserId,
  invoiceId,
  message,
  payoutAccountId,
  payoutAmountCents
}) {
  requireValues({
    invoiceId,
    payoutAccountId,
    payoutAmountCents,
    message
  });

  const invoice = await InvoicesDAO.findById(invoiceId);
  assert(invoice, `No invoice with ID ${invoiceId}`);

  const payoutAccount = await PartnerPayoutAccountsDAO.findById(
    payoutAccountId
  );
  assert(payoutAccount, `No payout account with ID ${payoutAccountId}`);

  const vendorUser = await UsersDAO.findById(payoutAccount.userId);

  // Construct the Stripe transaction description to (a) make it clear what
  // they're being paid for, and (b) let use use the description as part of the
  // idempotency key, so that we can send different transfers with different
  // descriptions.
  const description = `${invoice.title}: ${message}`;

  // Send the transfer first; if it fails we don't send emails or create logs
  await StripeService.sendTransfer({
    destination: payoutAccount.stripeUserId,
    amountCents: payoutAmountCents,
    description,
    invoiceId
  });

  await PartnerPayoutLogsDAO.create({
    initiatorUserId,
    invoiceId,
    message,
    payoutAccountId,
    payoutAmountCents
  });

  await EmailService.enqueueSend({
    to: vendorUser.email,
    cc: ADMIN_EMAIL,
    templateName: 'partner_payout',
    params: {
      payoutAmountCents,
      message
    }
  });
}

module.exports = payOutPartner;
