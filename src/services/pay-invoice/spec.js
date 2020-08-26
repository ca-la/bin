"use strict";

const InvalidDataError = require("../../errors/invalid-data");
const CreditsDAO = require("../../components/credits/dao");
const payInvoice = require("./index");
const SlackService = require("../slack");
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
  sandbox().stub(SlackService, "enqueueSend").returns(Promise.resolve());
  const trx = await db.transaction();

  try {
    const {
      collections,
      users,
      createdInvoices,
      paymentMethod,
    } = await createInvoicesWithPayments();
    const unpaidInvoice = createdInvoices[2];

    const paidInvoice = await payInvoice(
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

    t.ok(
      SlackService.enqueueSend.calledWith({
        channel: "designers",
        templateName: "designer_payment",
        params: {
          collection: collections[1],
          designer: users[1],
          paymentAmountCents: unpaidInvoice.totalCents,
        },
      }),
      "sent Slack notification"
    );
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
  sandbox().stub(SlackService, "enqueueSend").returns(Promise.resolve());

  const {
    users,
    createdInvoices,
    paymentMethod,
  } = await createInvoicesWithPayments();

  const unpaidInvoice = createdInvoices[2];

  await CreditsDAO.addCredit({
    description: "free money",
    amountCents: 1000000,
    createdBy: users[1].id,
    givenTo: users[1].id,
    expiresAt: null,
  });

  const trx = await db.transaction();
  try {
    const paidInvoice = await payInvoice(
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
  sandbox().stub(SlackService, "enqueueSend").returns(Promise.resolve());

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
