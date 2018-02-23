'use strict';

const DesignsDAO = require('../../dao/product-designs');
const findDesignUsers = require('../find-design-users');
const InvalidDataError = require('../../errors/invalid-data');
const InvoicesDAO = require('../../dao/invoices');
const PartnerPayoutAccountsDAO = require('../../dao/partner-payout-accounts');
const PartnerPayoutLogsDAO = require('../../dao/partner-payout-logs');
const { enqueueSend } = require('../email');
const { requireValues } = require('../require-properties');
const { sendTransfer } = require('../stripe');

function assert(val, message) {
  if (!val) {
    throw new InvalidDataError(message);
  }
}

// Pay out a partner for some portion of their work, and send them an email
// about it.
//
// Until the time when we have automatic payouts, this is a manual process with
// a few safeguards in place:
//  - We make sure this partner is someone shared on this design
//  - We make sure the payout amount is <= the invoice amount
async function payOutPartner({
  initiatorUserId,
  invoiceId,
  message,
  payoutAccountId,
  payoutAmountCents
}) {
  requireValues({ invoiceId, payoutAccountId, payoutAmountCents, message });

  const invoice = await InvoicesDAO.findById(invoiceId);
  assert(invoice, `No invoice with ID ${invoiceId}`);

  const payoutAccount = await PartnerPayoutAccountsDAO.findById(payoutAccountId);
  assert(payoutAccount, `No payout account with ID ${payoutAccountId}`);

  assert(payoutAmountCents <= invoice.totalCents, 'Payout amount cannot be larger than invoice amount');

  const designUsers = await findDesignUsers(invoice.designId);

  const design = await DesignsDAO.findById(invoice.designId);
  assert(design, `No design with ID ${invoice.designId}`);

  const vendorUser = designUsers.find(user =>
    user.id === payoutAccount.userId
  );

  assert(vendorUser, "This vendor doesn't appear to be shared on this design");

  await PartnerPayoutLogsDAO.create({
    initiatorUserId,
    invoiceId,
    message,
    payoutAccountId,
    payoutAmountCents
  });

  await enqueueSend(
    vendorUser.email,
    'partner_payout',
    {
      design,
      payoutAmountCents,
      message
    }
  );

  await sendTransfer({
    destination: payoutAccount.stripeUserId,
    amountCents: payoutAmountCents,
    description: invoice.title,
    invoiceId
  });
}

module.exports = payOutPartner;
