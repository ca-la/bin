"use strict";

const Router = require("koa-router");

const canAccessUserResource = require("../../middleware/can-access-user-resource");
const InvoicesDAO = require("../../dao/invoices");
const requireAdmin = require("../../middleware/require-admin");
const useTransaction = require("../../middleware/use-transaction").default;
const User = require("../../components/users/domain-object");

const router = new Router();

const InvalidDataError = require("../../errors/invalid-data");
const PartnerPayoutAccountsDAO = require("../../dao/partner-payout-accounts");
const PartnerPayoutLogsDAO = require("../../components/partner-payouts/dao");
const UsersDAO = require("../../components/users/dao");
const EmailService = require("../../services/email");
const { requireValues } = require("../../services/require-properties");
const StripeService = require("../../services/stripe");
const { ADMIN_EMAIL } = require("../../config");

function assert(val, message) {
  if (!val) {
    throw new InvalidDataError(message);
  }
}

function* getInvoices() {
  const { collectionId, userId } = this.query;

  let invoices;

  if (userId) {
    canAccessUserResource.call(this, userId);
    invoices = yield InvoicesDAO.findByUser(userId);
  } else if (collectionId) {
    const isAdmin = this.state.role === User.ROLES.ADMIN;
    this.assert(isAdmin, 403);
    invoices = yield InvoicesDAO.findByCollection(collectionId);
  } else {
    this.throw(400, "User ID or collection ID is required");
  }

  this.body = invoices;
  this.status = 200;
}

function* getInvoice() {
  const { invoiceId } = this.params;

  const invoice = yield InvoicesDAO.findById(invoiceId);
  this.assert(invoice, 404);

  this.body = invoice;

  this.status = 200;
}

function* deleteInvoice() {
  const { invoiceId } = this.params;

  yield InvoicesDAO.deleteById(invoiceId);

  this.status = 204;
}

/**
 * TODO: This function temporarily inline while payout to bid is not deployed.
 * After bid payout deployment all invoice payout will be removed
 */
async function payOutPartner({
  initiatorUserId,
  invoiceId,
  message,
  payoutAccountId,
  payoutAmountCents,
  trx,
}) {
  requireValues({
    invoiceId,
    payoutAccountId,
    payoutAmountCents,
    message,
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
    invoiceId,
    bidId: null,
  });

  await PartnerPayoutLogsDAO.create(trx, {
    initiatorUserId,
    invoiceId,
    message,
    payoutAccountId,
    payoutAmountCents,
    bidId: null,
    isManual: false,
  });

  // TODO: convert to `single_notification` template and construct a NotificationMessage.
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

function* postPayOut() {
  const { invoiceId } = this.params;
  const { message, payoutAccountId, payoutAmountCents } = this.request.body;
  const { trx } = this.state;
  this.assert(message, 400, "Missing message");
  this.assert(payoutAccountId, 400, "Missing payout account ID");
  this.assert(payoutAmountCents, 400, "Missing payout amount");

  yield payOutPartner({
    initiatorUserId: this.state.userId,
    invoiceId,
    payoutAccountId,
    payoutAmountCents,
    message,
    trx,
  });

  this.status = 204;
}

router.get("/", getInvoices);
router.get("/:invoiceId", requireAdmin, getInvoice);
router.del("/:invoiceId", requireAdmin, deleteInvoice);
router.post(
  "/:invoiceId/pay-out-to-partner",
  requireAdmin,
  useTransaction,
  postPayOut
);

module.exports = router.routes();
