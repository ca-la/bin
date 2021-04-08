import Knex from "knex";

import { sandbox, test, Test } from "../../test-helpers/fresh";
import PaymentMethodsDAO from "../../components/payment-methods/dao";
import * as UsersDAO from "../../components/users/dao";
import * as SubscriptionsDAO from "../../components/subscriptions/dao";
import TeamUsersDAO from "../../components/team-users/dao";
import insecureHash from "../insecure-hash";
import { PlanStripePriceType } from "../../components/plan-stripe-price/types";
import InvalidPaymentError from "../../errors/invalid-payment";
import StripeError from "../../errors/stripe";

import * as RequestService from "./make-request";
import {
  findOrCreateCustomerId,
  addSeatCharge,
  removeSeatCharge,
  getBalances,
  sendTransfer,
} from ".";

test("sendTransfer with a Bid Id", async (t: Test) => {
  const makeRequestStub = sandbox().stub(RequestService, "default").resolves({
    id: "a-transfer-id",
  });
  const data = {
    destination: "my wallet",
    amountCents: 2222,
    description: "here is money.",
    bidId: "a-real-bid-id",
    invoiceId: null,
  };
  await sendTransfer(data);
  t.deepEqual(makeRequestStub.firstCall.args[0].data, {
    amount: data.amountCents,
    currency: "usd",
    destination: data.destination,
    description: data.description,
    transfer_group: data.bidId,
    source_type: undefined,
  });

  const idempotencyKey = insecureHash(
    `${data.description}-${data.bidId}-${data.destination}`
  );
  t.equal(makeRequestStub.firstCall.args[0].idempotencyKey, idempotencyKey);
});

test("sendTransfer with a invoice Id", async (t: Test) => {
  const makeRequestStub = sandbox().stub(RequestService, "default").resolves({
    id: "a-transfer-id",
  });
  const data = {
    destination: "my wallet",
    amountCents: 2222,
    description: "here is money.",
    bidId: null,
    invoiceId: "a-real-invoice-id",
  };
  await sendTransfer(data);
  t.deepEqual(makeRequestStub.firstCall.args[0].data, {
    amount: data.amountCents,
    currency: "usd",
    destination: data.destination,
    description: data.description,
    transfer_group: data.invoiceId,
    source_type: undefined,
  });

  const idempotencyKey = insecureHash(
    `${data.description}-${data.invoiceId}-${data.destination}`
  );
  t.equal(makeRequestStub.firstCall.args[0].idempotencyKey, idempotencyKey);
});

test("sendTransfer with a sourceType", async (t: Test) => {
  const makeRequestStub = sandbox().stub(RequestService, "default").resolves({
    id: "a-transfer-id",
  });
  const data = {
    destination: "my wallet",
    amountCents: 2222,
    description: "here is money.",
    bidId: "a-real-bid-id",
    sourceType: "financing",
    invoiceId: null,
  };

  await sendTransfer(data);
  t.deepEqual(makeRequestStub.firstCall.args[0].data, {
    amount: data.amountCents,
    currency: "usd",
    destination: data.destination,
    description: data.description,
    transfer_group: data.bidId,
    source_type: "financing",
  });
});

test("getBalances", async (t: Test) => {
  sandbox()
    .stub(RequestService, "default")
    .resolves({
      object: "balance",
      available: [
        {
          amount: 3109190,
          currency: "usd",
          source_types: {
            bank_account: 300123,
            card: 200456,
            fpx: 100789,
          },
        },
      ],
      connect_reserved: [
        {
          amount: 0,
          currency: "usd",
        },
      ],
      livemode: true,
      pending: [
        {
          amount: -65,
          currency: "usd",
          source_types: {
            bank_account: 0,
            card: -65,
            financing: 0,
          },
        },
      ],
    });

  const balance = await getBalances();

  t.deepEqual(balance, {
    bank_account: 300123,
    card: 200456,
    fpx: 100789,
  });
});

test("findOrCreateCustomerId: no existing customer", async (t: Test) => {
  const trx = (sandbox().stub() as unknown) as Knex.Transaction;
  sandbox().stub(PaymentMethodsDAO, "findByUserId").resolves([]);
  sandbox()
    .stub(UsersDAO, "findById")
    .resolves({ email: "example@example.com", name: "Exemplar" });
  const requestStub = sandbox().stub(RequestService, "default");

  requestStub.onFirstCall().resolves({ object: "list", data: [] }); // GET /customers email=example@example.com
  requestStub.onSecondCall().resolves({ id: "a-stripe-customer-id" }); // POST /customers

  const customerId = await findOrCreateCustomerId("a-user-id", trx);

  t.equal(customerId, "a-stripe-customer-id", "returns Stripe response ID");

  t.deepEqual(
    requestStub.args,
    [
      [
        {
          method: "get",
          path: "/customers?email=example%40example.com&limit=1",
        },
      ],
      [
        {
          method: "post",
          path: "/customers",
          data: { email: "example@example.com", description: "Exemplar" },
        },
      ],
    ],
    "makes the correct calls to Stripe"
  );
});

test("findOrCreateCustomerId: stripe customer no PaymentMethod", async (t: Test) => {
  const trx = (sandbox().stub() as unknown) as Knex.Transaction;
  sandbox().stub(PaymentMethodsDAO, "findByUserId").resolves([]);
  sandbox()
    .stub(UsersDAO, "findById")
    .resolves({ email: "example@example.com", name: "Exemplar" });
  const requestStub = sandbox().stub(RequestService, "default");

  requestStub
    .onFirstCall()
    .resolves({ object: "list", data: [{ id: "a-stripe-customer-id" }] }); // GET /customers email=example@example.com

  const customerId = await findOrCreateCustomerId("a-user-id", trx);

  t.equal(customerId, "a-stripe-customer-id", "returns Stripe response ID");

  t.deepEqual(
    requestStub.args,
    [
      [
        {
          method: "get",
          path: "/customers?email=example%40example.com&limit=1",
        },
      ],
    ],
    "makes the correct calls to Stripe"
  );
});

test("findOrCreateCustomerId: stripe customer with PaymentMethod", async (t: Test) => {
  const trx = (sandbox().stub() as unknown) as Knex.Transaction;
  sandbox()
    .stub(PaymentMethodsDAO, "findByUserId")
    .resolves([{ stripeCustomerId: "a-stripe-customer-id" }]);
  sandbox()
    .stub(UsersDAO, "findById")
    .resolves({ email: "example@example.com", name: "Exemplar" });
  const requestStub = sandbox().stub(RequestService, "default");

  const customerId = await findOrCreateCustomerId("a-user-id", trx);

  t.equal(customerId, "a-stripe-customer-id", "returns Stripe response ID");

  t.deepEqual(requestStub.args, [], "doesn't lookup user from Stripe");
});

test("addSeatCharge", async (t: Test) => {
  const trx = (sandbox().stub() as unknown) as Knex.Transaction;
  const teamPlansStub = sandbox()
    .stub(SubscriptionsDAO, "findForTeamWithPlans")
    .resolves([
      {
        stripeSubscriptionId: "a-stripe-subscription-id",
        plan: {
          stripePrices: [
            {
              type: PlanStripePriceType.PER_SEAT,
              stripePriceId: "a-stripe-price-id",
            },
            {
              type: PlanStripePriceType.BASE_COST,
              stripePriceId: "another-stripe-price-id",
            },
          ],
        },
      },
    ]);
  const nonViewerCountStub = sandbox()
    .stub(TeamUsersDAO, "countBilledUsers")
    .resolves(4);
  const makeRequestStub = sandbox().stub(RequestService, "default");

  // GET /subscriptions/:id
  makeRequestStub.onFirstCall().resolves({
    id: "a-stripe-subscription-id",
    latest_invoice: null,
    items: {
      object: "list",
      data: [
        {
          id: "a-subscription-item-id",
          price: {
            id: "a-stripe-price-id",
          },
          quantity: 3,
        },
        {
          id: "another-subscription-item-id",
          price: {
            id: "another-stripe-price-id",
          },
          quantity: 0,
        },
      ],
    },
  });

  // POST /subscription_items/:id
  makeRequestStub.onSecondCall().resolves({
    id: "a-subscription-item-id",
    price: {
      id: "a-stripe-price-id",
    },
    quantity: 4,
  });

  await addSeatCharge(trx, "a-team-id");

  t.deepEqual(
    teamPlansStub.args,
    [[trx, "a-team-id", { isActive: true }]],
    "looks up team plan by team ID"
  );

  t.deepEqual(
    nonViewerCountStub.args,
    [[trx, "a-team-id"]],
    "looks up team's non-viewer count by team ID"
  );

  t.deepEqual(
    makeRequestStub.args,
    [
      [
        {
          method: "get",
          path: "/subscriptions/a-stripe-subscription-id",
        },
      ],
      [
        {
          method: "post",
          path: "/subscription_items/a-subscription-item-id",
          data: {
            payment_behavior: "error_if_incomplete",
            proration_behavior: "always_invoice",
            quantity: 4,
          },
        },
      ],
    ],
    "makes the correct calls to Stripe"
  );
});

test("addSeatCharge: no per-seat item", async (t: Test) => {
  const trx = (sandbox().stub() as unknown) as Knex.Transaction;
  const makeRequestStub = sandbox().stub(RequestService, "default");
  const teamPlansStub = sandbox()
    .stub(SubscriptionsDAO, "findForTeamWithPlans")
    .resolves([
      {
        stripeSubscriptionId: "a-stripe-subscription-id",
        plan: {
          stripePrices: [
            {
              type: PlanStripePriceType.BASE_COST,
            },
          ],
        },
      },
    ]);
  const nonViewerCountStub = sandbox()
    .stub(TeamUsersDAO, "countBilledUsers")
    .resolves(4);

  await addSeatCharge(trx, "a-team-id");

  t.deepEqual(
    teamPlansStub.args,
    [[trx, "a-team-id", { isActive: true }]],
    "looks up team plan by team ID"
  );
  t.equal(nonViewerCountStub.callCount, 0, "does not look up non-viewer count");
  t.equal(makeRequestStub.callCount, 0, "does not make any requests to Stripe");
});

test("addSeatCharge: no stripe subscription", async (t: Test) => {
  const trx = (sandbox().stub() as unknown) as Knex.Transaction;
  const makeRequestStub = sandbox().stub(RequestService, "default");
  const teamPlansStub = sandbox()
    .stub(SubscriptionsDAO, "findForTeamWithPlans")
    .resolves([
      {
        id: "a-subscription-id",
        stripeSubscriptionId: null,
        plan: {
          stripePrices: [
            {
              type: PlanStripePriceType.BASE_COST,
            },
          ],
        },
      },
    ]);
  const nonViewerCountStub = sandbox()
    .stub(TeamUsersDAO, "countBilledUsers")
    .resolves(4);

  try {
    await addSeatCharge(trx, "a-team-id");
    t.fail("should not succeed");
  } catch (err) {
    t.deepEqual(
      err,
      new Error(
        "Could not find a stripe subscription for subscription with ID a-subscription-id"
      ),
      "throws when missing stripe subscription"
    );
  }

  t.deepEqual(
    teamPlansStub.args,
    [[trx, "a-team-id", { isActive: true }]],
    "looks up team plan by team ID"
  );
  t.equal(nonViewerCountStub.callCount, 0, "does not look up non-viewer count");
  t.equal(makeRequestStub.callCount, 0, "does not make any requests to Stripe");
});

test("addSeatCharge: no team subscription", async (t: Test) => {
  const trx = (sandbox().stub() as unknown) as Knex.Transaction;
  const makeRequestStub = sandbox().stub(RequestService, "default");
  const teamPlansStub = sandbox()
    .stub(SubscriptionsDAO, "findForTeamWithPlans")
    .resolves([]);
  const nonViewerCountStub = sandbox()
    .stub(TeamUsersDAO, "countBilledUsers")
    .resolves(4);

  try {
    await addSeatCharge(trx, "a-team-id");
    t.fail("should not succeed");
  } catch (err) {
    t.deepEqual(
      err,
      new Error("Could not find a subscription for team with ID a-team-id"),
      "throws when missing team subscription"
    );
  }

  t.deepEqual(
    teamPlansStub.args,
    [[trx, "a-team-id", { isActive: true }]],
    "looks up team plan by team ID"
  );
  t.equal(nonViewerCountStub.callCount, 0, "does not look up non-viewer count");
  t.equal(makeRequestStub.callCount, 0, "does not make any requests to Stripe");
});

test("addSeatCharge: failed payment", async (t: Test) => {
  const trx = (sandbox().stub() as unknown) as Knex.Transaction;
  const teamPlansStub = sandbox()
    .stub(SubscriptionsDAO, "findForTeamWithPlans")
    .resolves([
      {
        stripeSubscriptionId: "a-stripe-subscription-id",
        plan: {
          stripePrices: [
            {
              type: PlanStripePriceType.PER_SEAT,
              stripePriceId: "a-stripe-price-id",
            },
            {
              type: PlanStripePriceType.BASE_COST,
              stripePriceId: "another-stripe-price-id",
            },
          ],
        },
      },
    ]);
  const nonViewerCountStub = sandbox()
    .stub(TeamUsersDAO, "countBilledUsers")
    .resolves(4);
  const makeRequestStub = sandbox().stub(RequestService, "default");

  // GET /subscriptions/:id
  makeRequestStub.onFirstCall().resolves({
    id: "a-stripe-subscription-id",
    latest_invoice: null,
    items: {
      object: "list",
      data: [
        {
          id: "a-subscription-item-id",
          price: {
            id: "a-stripe-price-id",
          },
          quantity: 3,
        },
        {
          id: "another-subscription-item-id",
          price: {
            id: "another-stripe-price-id",
          },
          quantity: 0,
        },
      ],
    },
  });

  // POST /subscription_items/:id
  makeRequestStub
    .onSecondCall()
    .rejects(new InvalidPaymentError("Your payment method was declined"));

  try {
    await addSeatCharge(trx, "a-team-id");
    t.fail("should not succeed");
  } catch (err) {
    t.deepEqual(
      err,
      new InvalidPaymentError("Your payment method was declined")
    );
  }

  t.deepEqual(
    teamPlansStub.args,
    [[trx, "a-team-id", { isActive: true }]],
    "looks up team plan by team ID"
  );

  t.deepEqual(
    nonViewerCountStub.args,
    [[trx, "a-team-id"]],
    "looks up team's non-viewer count by team ID"
  );

  t.deepEqual(
    makeRequestStub.args,
    [
      [
        {
          method: "get",
          path: "/subscriptions/a-stripe-subscription-id",
        },
      ],
      [
        {
          method: "post",
          path: "/subscription_items/a-subscription-item-id",
          data: {
            payment_behavior: "error_if_incomplete",
            proration_behavior: "always_invoice",
            quantity: 4,
          },
        },
      ],
    ],
    "makes the correct calls to Stripe"
  );
});

test("addSeatCharge: stripe subscription not found", async (t: Test) => {
  const trx = (sandbox().stub() as unknown) as Knex.Transaction;
  const teamPlansStub = sandbox()
    .stub(SubscriptionsDAO, "findForTeamWithPlans")
    .resolves([
      {
        stripeSubscriptionId: "a-stripe-subscription-id",
        plan: {
          stripePrices: [
            {
              type: PlanStripePriceType.PER_SEAT,
              stripePriceId: "a-stripe-price-id",
            },
            {
              type: PlanStripePriceType.BASE_COST,
              stripePriceId: "another-stripe-price-id",
            },
          ],
        },
      },
    ]);
  const nonViewerCountStub = sandbox()
    .stub(TeamUsersDAO, "countBilledUsers")
    .resolves(4);
  const makeRequestStub = sandbox().stub(RequestService, "default");

  const resourceMissingError = new StripeError({
    code: "resource_missing",
    doc_url: "https://stripe.com/docs/error-codes/resource-missing",
    message: "No such subscription: 'a-stripe-subscription-id'",
    param: "id",
    type: "invalid_request_error",
  } as any);

  // GET /subscriptions/:id
  makeRequestStub.onFirstCall().rejects(resourceMissingError);

  try {
    await addSeatCharge(trx, "a-team-id");
    t.fail("should not succeed");
  } catch (err) {
    t.deepEqual(err, resourceMissingError);
  }

  t.deepEqual(
    teamPlansStub.args,
    [[trx, "a-team-id", { isActive: true }]],
    "looks up team plan by team ID"
  );

  t.equal(nonViewerCountStub.callCount, 0, "does not look up non-viewer count");

  t.deepEqual(
    makeRequestStub.args,
    [
      [
        {
          method: "get",
          path: "/subscriptions/a-stripe-subscription-id",
        },
      ],
    ],
    "makes the correct calls to Stripe"
  );
});

test("removeSeatCharge", async (t: Test) => {
  const trx = (sandbox().stub() as unknown) as Knex.Transaction;
  const teamPlansStub = sandbox()
    .stub(SubscriptionsDAO, "findForTeamWithPlans")
    .resolves([
      {
        stripeSubscriptionId: "a-stripe-subscription-id",
        plan: {
          stripePrices: [
            {
              type: PlanStripePriceType.PER_SEAT,
              stripePriceId: "a-stripe-price-id",
            },
            {
              type: PlanStripePriceType.BASE_COST,
              stripePriceId: "another-stripe-price-id",
            },
          ],
        },
      },
    ]);
  const nonViewerCountStub = sandbox()
    .stub(TeamUsersDAO, "countBilledUsers")
    .resolves(4);
  const makeRequestStub = sandbox().stub(RequestService, "default");

  // GET /subscriptions/:id
  makeRequestStub.onFirstCall().resolves({
    id: "a-stripe-subscription-id",
    latest_invoice: null,
    items: {
      object: "list",
      data: [
        {
          id: "a-subscription-item-id",
          price: {
            id: "a-stripe-price-id",
          },
          quantity: 5,
        },
        {
          id: "another-subscription-item-id",
          price: {
            id: "another-stripe-price-id",
          },
          quantity: 0,
        },
      ],
    },
  });

  // POST /subscription_items/:id
  makeRequestStub.onSecondCall().resolves({
    id: "a-subscription-item-id",
    price: {
      id: "a-stripe-price-id",
    },
    quantity: 4,
  });

  await removeSeatCharge(trx, "a-team-id");

  t.deepEqual(
    teamPlansStub.args,
    [[trx, "a-team-id", { isActive: true }]],
    "looks up team plan by team ID"
  );

  t.deepEqual(
    nonViewerCountStub.args,
    [[trx, "a-team-id"]],
    "looks up team's non-viewer count by team ID"
  );

  t.deepEqual(
    makeRequestStub.args,
    [
      [
        {
          method: "get",
          path: "/subscriptions/a-stripe-subscription-id",
        },
      ],
      [
        {
          method: "post",
          path: "/subscription_items/a-subscription-item-id",
          data: {
            payment_behavior: "error_if_incomplete",
            proration_behavior: "none",
            quantity: 4,
          },
        },
      ],
    ],
    "makes the correct calls to Stripe"
  );
});

test("removeSeatCharge: no per-seat item", async (t: Test) => {
  const trx = (sandbox().stub() as unknown) as Knex.Transaction;
  const makeRequestStub = sandbox().stub(RequestService, "default");
  const teamPlansStub = sandbox()
    .stub(SubscriptionsDAO, "findForTeamWithPlans")
    .resolves([
      {
        stripeSubscriptionId: "a-stripe-subscription-id",
        plan: {
          stripePrices: [
            {
              type: PlanStripePriceType.BASE_COST,
            },
          ],
        },
      },
    ]);
  const nonViewerCountStub = sandbox()
    .stub(TeamUsersDAO, "countBilledUsers")
    .resolves(4);

  await removeSeatCharge(trx, "a-team-id");

  t.deepEqual(
    teamPlansStub.args,
    [[trx, "a-team-id", { isActive: true }]],
    "looks up team plan by team ID"
  );
  t.equal(nonViewerCountStub.callCount, 0, "does not look up non-viewer count");
  t.equal(makeRequestStub.callCount, 0, "does not make any requests to Stripe");
});

test("removeSeatCharge: no stripe subscription", async (t: Test) => {
  const trx = (sandbox().stub() as unknown) as Knex.Transaction;
  const makeRequestStub = sandbox().stub(RequestService, "default");
  const teamPlansStub = sandbox()
    .stub(SubscriptionsDAO, "findForTeamWithPlans")
    .resolves([
      {
        id: "a-subscription-id",
        stripeSubscriptionId: null,
        plan: {
          stripePrices: [
            {
              type: PlanStripePriceType.BASE_COST,
            },
          ],
        },
      },
    ]);
  const nonViewerCountStub = sandbox()
    .stub(TeamUsersDAO, "countBilledUsers")
    .resolves(4);

  try {
    await removeSeatCharge(trx, "a-team-id");
    t.fail("should not succeed");
  } catch (err) {
    t.deepEqual(
      err,
      new Error(
        "Could not find a stripe subscription for subscription with ID a-subscription-id"
      ),
      "throws when missing stripe subscription"
    );
  }

  t.deepEqual(
    teamPlansStub.args,
    [[trx, "a-team-id", { isActive: true }]],
    "looks up team plan by team ID"
  );
  t.equal(nonViewerCountStub.callCount, 0, "does not look up non-viewer count");
  t.equal(makeRequestStub.callCount, 0, "does not make any requests to Stripe");
});

test("removeSeatCharge: no team subscription", async (t: Test) => {
  const trx = (sandbox().stub() as unknown) as Knex.Transaction;
  const makeRequestStub = sandbox().stub(RequestService, "default");
  const teamPlansStub = sandbox()
    .stub(SubscriptionsDAO, "findForTeamWithPlans")
    .resolves([]);
  const nonViewerCountStub = sandbox()
    .stub(TeamUsersDAO, "countBilledUsers")
    .resolves(4);

  try {
    await removeSeatCharge(trx, "a-team-id");
    t.fail("should not succeed");
  } catch (err) {
    t.deepEqual(
      err,
      new Error("Could not find a subscription for team with ID a-team-id"),
      "throws when missing team subscription"
    );
  }

  t.deepEqual(
    teamPlansStub.args,
    [[trx, "a-team-id", { isActive: true }]],
    "looks up team plan by team ID"
  );
  t.equal(nonViewerCountStub.callCount, 0, "does not look up non-viewer count");
  t.equal(makeRequestStub.callCount, 0, "does not make any requests to Stripe");
});

test("removeSeatCharge: failed payment", async (t: Test) => {
  const trx = (sandbox().stub() as unknown) as Knex.Transaction;
  const teamPlansStub = sandbox()
    .stub(SubscriptionsDAO, "findForTeamWithPlans")
    .resolves([
      {
        stripeSubscriptionId: "a-stripe-subscription-id",
        plan: {
          stripePrices: [
            {
              type: PlanStripePriceType.PER_SEAT,
              stripePriceId: "a-stripe-price-id",
            },
            {
              type: PlanStripePriceType.BASE_COST,
              stripePriceId: "another-stripe-price-id",
            },
          ],
        },
      },
    ]);
  const nonViewerCountStub = sandbox()
    .stub(TeamUsersDAO, "countBilledUsers")
    .resolves(4);
  const makeRequestStub = sandbox().stub(RequestService, "default");

  // GET /subscriptions/:id
  makeRequestStub.onFirstCall().resolves({
    id: "a-stripe-subscription-id",
    latest_invoice: null,
    items: {
      object: "list",
      data: [
        {
          id: "a-subscription-item-id",
          price: {
            id: "a-stripe-price-id",
          },
          quantity: 5,
        },
        {
          id: "another-subscription-item-id",
          price: {
            id: "another-stripe-price-id",
          },
          quantity: 0,
        },
      ],
    },
  });

  // POST /subscription_items/:id
  makeRequestStub
    .onSecondCall()
    .rejects(new InvalidPaymentError("Your payment method was declined"));

  try {
    await removeSeatCharge(trx, "a-team-id");
    t.fail("should not succeed");
  } catch (err) {
    t.deepEqual(
      err,
      new InvalidPaymentError("Your payment method was declined")
    );
  }

  t.deepEqual(
    teamPlansStub.args,
    [[trx, "a-team-id", { isActive: true }]],
    "looks up team plan by team ID"
  );

  t.deepEqual(
    nonViewerCountStub.args,
    [[trx, "a-team-id"]],
    "looks up team's non-viewer count by team ID"
  );

  t.deepEqual(
    makeRequestStub.args,
    [
      [
        {
          method: "get",
          path: "/subscriptions/a-stripe-subscription-id",
        },
      ],
      [
        {
          method: "post",
          path: "/subscription_items/a-subscription-item-id",
          data: {
            payment_behavior: "error_if_incomplete",
            proration_behavior: "none",
            quantity: 4,
          },
        },
      ],
    ],
    "makes the correct calls to Stripe"
  );
});

test("removeSeatCharge: stripe subscription not found", async (t: Test) => {
  const trx = (sandbox().stub() as unknown) as Knex.Transaction;
  const teamPlansStub = sandbox()
    .stub(SubscriptionsDAO, "findForTeamWithPlans")
    .resolves([
      {
        stripeSubscriptionId: "a-stripe-subscription-id",
        plan: {
          stripePrices: [
            {
              type: PlanStripePriceType.PER_SEAT,
              stripePriceId: "a-stripe-price-id",
            },
            {
              type: PlanStripePriceType.BASE_COST,
              stripePriceId: "another-stripe-price-id",
            },
          ],
        },
      },
    ]);
  const nonViewerCountStub = sandbox()
    .stub(TeamUsersDAO, "countBilledUsers")
    .resolves(4);
  const makeRequestStub = sandbox().stub(RequestService, "default");

  const resourceMissingError = new StripeError({
    code: "resource_missing",
    doc_url: "https://stripe.com/docs/error-codes/resource-missing",
    message: "No such subscription: 'a-stripe-subscription-id'",
    param: "id",
    type: "invalid_request_error",
  } as any);

  // GET /subscriptions/:id
  makeRequestStub.onFirstCall().rejects(resourceMissingError);

  try {
    await removeSeatCharge(trx, "a-team-id");
    t.fail("should not succeed");
  } catch (err) {
    t.deepEqual(err, resourceMissingError);
  }

  t.deepEqual(
    teamPlansStub.args,
    [[trx, "a-team-id", { isActive: true }]],
    "looks up team plan by team ID"
  );

  t.equal(nonViewerCountStub.callCount, 0, "does not look up non-viewer count");

  t.deepEqual(
    makeRequestStub.args,
    [
      [
        {
          method: "get",
          path: "/subscriptions/a-stripe-subscription-id",
        },
      ],
    ],
    "makes the correct calls to Stripe"
  );
});
