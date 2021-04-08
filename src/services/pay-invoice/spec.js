"use strict";

const { CreditType } = require("../../components/credits");

const InvalidDataError = require("../../errors/invalid-data");
const { CreditsDAO } = require("../../components/credits");
const payInvoice = require("./index");
const db = require("../db");
const Stripe = require("../stripe");
const {
  createInvoicesWithPayments,
} = require("../../test-helpers/factories/invoice-payments");
const { test, sandbox } = require("../../test-helpers/fresh");

test("payInvoice", async (t) => {
  sandbox()
    .stub(Stripe, "charge")
    .returns(Promise.resolve({ id: "chargeId" }));

  const trx = await db.transaction();

  try {
    const {
      users,
      createdInvoices,
      paymentMethod,
    } = await createInvoicesWithPayments();
    const unpaidInvoice = createdInvoices[2];

    const { invoice: paidInvoice } = await payInvoice(
      unpaidInvoice.id,
      paymentMethod.id,
      users[1].id,
      trx
    );

    t.ok(
      Stripe.charge.calledWith({
        customerId: paymentMethod.stripeCustomerId,
        sourceId: paymentMethod.stripeSourceId,
        amountCents: unpaidInvoice.totalCents,
        description: unpaidInvoice.title,
        invoiceId: unpaidInvoice.id,
      }),
      "charged via Stripe"
    );
    t.ok(Stripe.charge.calledOnce, "only charge once");

    t.ok(Stripe.charge.calledOnce, "only notify once");

    t.ok(paidInvoice.isPaid, "paid invoice is paid");
    t.equal(
      paidInvoice.totalPaid,
      unpaidInvoice.totalCents,
      "total paid is total invoice due"
    );
    t.ok(paidInvoice.paidAt, "has a last paid at date");
  } finally {
    await trx.rollback();
  }
});

test("payInvoice does not charge a $0 amount", async (t) => {
  sandbox().stub(Stripe, "charge");

  const {
    users,
    createdInvoices,
    paymentMethod,
  } = await createInvoicesWithPayments();

  const unpaidInvoice = createdInvoices[2];

  const trx = await db.transaction();
  await CreditsDAO.create(trx, {
    type: CreditType.MANUAL,
    creditDeltaCents: 1000000,
    createdBy: users[1].id,
    description: "free money",
    expiresAt: null,
    givenTo: users[1].id,
  });

  try {
    const { invoice: paidInvoice } = await payInvoice(
      unpaidInvoice.id,
      paymentMethod.id,
      users[1].id,
      trx
    );

    t.equal(Stripe.charge.callCount, 0, "Stripe is not called");

    t.ok(paidInvoice.isPaid, "paid invoice is paid");
  } finally {
    await trx.rollback();
  }
});

test("payInvoice cannot pay the same invoice twice in parallel", async (t) => {
  sandbox()
    .stub(Stripe, "charge")
    .returns(Promise.resolve({ id: "chargeId" }));

  const {
    users,
    createdInvoices,
    paymentMethod,
  } = await createInvoicesWithPayments();

  const unpaidInvoice = createdInvoices[2];

  async function attemptPayment() {
    const trx = await db.transaction();
    try {
      await payInvoice(unpaidInvoice.id, paymentMethod.id, users[1].id, trx);
      await trx.commit();
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  }

  try {
    await Promise.all([attemptPayment(), attemptPayment()]);

    throw new Error("Shouldn't get here");
  } catch (err) {
    t.ok(err instanceof InvalidDataError);
    t.equal(err.message, "This invoice is already paid");
  }
});
