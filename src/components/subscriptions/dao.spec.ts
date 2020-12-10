import tape from "tape";
import uuid from "node-uuid";
import Knex from "knex";

import { test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";
import db from "../../services/db";
import * as SubscriptionsDAO from "./dao";
import * as PlansDAO from "../plans/dao";
import { BillingInterval } from "../plans/domain-object";
import PaymentMethodsDAO from "../payment-methods/dao";

test("SubscriptionsDAO supports creation and retrieval", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const paymentMethod = await PaymentMethodsDAO.create({
    userId: user.id,
    stripeCustomerId: "customer1",
    stripeSourceId: "source1",
    lastFourDigits: "1234",
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    const plan = await PlansDAO.create(trx, {
      id: uuid.v4(),
      billingInterval: BillingInterval.MONTHLY,
      monthlyCostCents: 4567,
      costOfGoodsShareBasisPoints: 0,
      revenueShareBasisPoints: 1200,
      stripePlanId: "plan_456",
      title: "Some More",
      isDefault: true,
      isPublic: false,
      ordering: null,
      description: null,
      baseCostPerBillingIntervalCents: 4567,
      perSeatCostPerBillingIntervalCents: 0,
      canSubmit: true,
      canCheckOut: true,
      maximumSeatsPerTeam: null,
    });

    const subscription = await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: plan.id,
        paymentMethodId: paymentMethod.id,
        stripeSubscriptionId: "123",
        userId: user.id,
        isPaymentWaived: false,
      },
      trx
    );

    const found = await SubscriptionsDAO.findForUser(user.id, trx);
    t.equal(found.length, 1);
    t.equal(found[0].id, subscription.id);
  });
});

test("SubscriptionsDAO supports waiving payment on a new subscription", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  await db.transaction(async (trx: Knex.Transaction) => {
    const plan = await PlansDAO.create(trx, {
      id: uuid.v4(),
      billingInterval: BillingInterval.MONTHLY,
      monthlyCostCents: 4567,
      costOfGoodsShareBasisPoints: 0,
      revenueShareBasisPoints: 1200,
      stripePlanId: "plan_456",
      title: "Some More",
      isDefault: true,
      isPublic: false,
      ordering: null,
      description: null,
      baseCostPerBillingIntervalCents: 4567,
      perSeatCostPerBillingIntervalCents: 0,
      canSubmit: true,
      canCheckOut: true,
      maximumSeatsPerTeam: null,
    });

    const subscription = await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: plan.id,
        paymentMethodId: null,
        stripeSubscriptionId: null,
        userId: user.id,
        isPaymentWaived: true,
      },
      trx
    );

    const found = await SubscriptionsDAO.findForUser(user.id, trx);
    t.equal(found.length, 1);
    t.equal(found[0].id, subscription.id);
    t.equal(found[0].isPaymentWaived, true);
  });
});

test("SubscriptionsDAO.findActive lists only active subscriptions", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const paymentMethod = await PaymentMethodsDAO.create({
    userId: user.id,
    stripeCustomerId: "customer1",
    stripeSourceId: "source1",
    lastFourDigits: "1234",
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    const plan = await PlansDAO.create(trx, {
      id: uuid.v4(),
      billingInterval: BillingInterval.MONTHLY,
      monthlyCostCents: 4567,
      costOfGoodsShareBasisPoints: 0,
      revenueShareBasisPoints: 1200,
      stripePlanId: "plan_456",
      title: "Some More",
      isDefault: true,
      isPublic: false,
      ordering: null,
      description: null,
      baseCostPerBillingIntervalCents: 4567,
      perSeatCostPerBillingIntervalCents: 0,
      canSubmit: true,
      canCheckOut: true,
      maximumSeatsPerTeam: null,
    });

    await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: new Date("2000-01-01"),
        planId: plan.id,
        paymentMethodId: paymentMethod.id,
        stripeSubscriptionId: "123",
        userId: user.id,
        isPaymentWaived: false,
      },
      trx
    );

    const active1 = await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: plan.id,
        paymentMethodId: paymentMethod.id,
        stripeSubscriptionId: "123",
        userId: user.id,
        isPaymentWaived: false,
      },
      trx
    );

    const active2 = await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: new Date("3000-01-01"),
        planId: plan.id,
        paymentMethodId: paymentMethod.id,
        stripeSubscriptionId: "123",
        userId: user.id,
        isPaymentWaived: false,
      },
      trx
    );

    const found = await SubscriptionsDAO.findActive(user.id, trx);
    t.equal(found.length, 2);
    t.equal(found[0].id, active1.id);
    t.equal(found[1].id, active2.id);
  });
});

test("SubscriptionsDAO supports updating", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const pm1 = await PaymentMethodsDAO.create({
    userId: user.id,
    stripeCustomerId: "customer1",
    stripeSourceId: "source1",
    lastFourDigits: "1234",
  });

  const pm2 = await PaymentMethodsDAO.create({
    userId: user.id,
    stripeCustomerId: "customer1",
    stripeSourceId: "source1",
    lastFourDigits: "1234",
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    const plan = await PlansDAO.create(trx, {
      id: uuid.v4(),
      billingInterval: BillingInterval.MONTHLY,
      monthlyCostCents: 4567,
      costOfGoodsShareBasisPoints: 0,
      revenueShareBasisPoints: 1200,
      stripePlanId: "plan_456",
      title: "Some More",
      isDefault: true,
      isPublic: false,
      ordering: null,
      description: null,
      baseCostPerBillingIntervalCents: 4567,
      perSeatCostPerBillingIntervalCents: 0,
      canSubmit: true,
      canCheckOut: true,
      maximumSeatsPerTeam: null,
    });

    const subscription = await SubscriptionsDAO.create(
      {
        id: uuid.v4(),
        cancelledAt: null,
        planId: plan.id,
        paymentMethodId: pm1.id,
        stripeSubscriptionId: "123",
        userId: user.id,
        isPaymentWaived: false,
      },
      trx
    );

    const updated = await SubscriptionsDAO.update(
      subscription.id,
      {
        paymentMethodId: pm2.id,
      },
      trx
    );

    t.equal(updated.paymentMethodId, pm2.id);
  });
});
