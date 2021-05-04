"use strict";

const Router = require("koa-router");

const canAccessUserResource = require("../../middleware/can-access-user-resource");
const InvoicesDAO = require("../../dao/invoices");
const requireAdmin = require("../../middleware/require-admin");
const User = require("../../components/users/domain-object");

const router = new Router();

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

router.get("/", getInvoices);
router.get("/:invoiceId", requireAdmin, getInvoice);
router.del("/:invoiceId", requireAdmin, deleteInvoice);

module.exports = router.routes();
