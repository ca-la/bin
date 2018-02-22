'use strict';

const InvalidDataError = require('../../errors/invalid-data');
const { requireValues } = require('../require-properties');

// Pay out a partner for some portion of their work, and send them an email
// about it.
//
// Until the time when we have automatic payouts, this is a manual process with
// a few safeguards in place:
//  - We make sure this partner is someone shared on this design
//  - We make sure the payout amount is <= the invoice amount
async function payOutPartner({
  invoiceId,
  payoutAccountId,
  payoutAmountCents,
  message
}) {
  requireValues({ invoiceId, payoutAccountId, payoutAmountCents, message });

  const invoice = await InvoicesDAO.findById(invoiceId);
  if (!invoice) { throw new InvalidDataError(`No invoice with ID ${invoiceId}`); }

  const payoutAccount = await PartnerPayoutAccountsDAO.findById(payoutAccountId);
  if (!payoutAccount) {
    throw new InvalidDataError(`No payout account with ID ${payoutAccountId}`);
  }

  if (payoutAmountCents > invoice.totalCents) {
    throw new Error('Payout amount cannot be larger than invoice amount');
  }
}

module.exports = payOutPartner;
