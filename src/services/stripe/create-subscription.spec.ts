import * as Fetch from "../fetch";

import { sandbox, test, Test } from "../../test-helpers/fresh";
import createSubscription from "./create-subscription";
import { PlanStripePriceType } from "../../components/plan-stripe-price/types";

test("createSubscription calls the correct api", async (t: Test) => {
  const fakeResponse = {
    headers: {
      get(): string {
        return "application/json";
      },
    },
    status: 200,
    json(): object {
      return {
        id: "sub_123",
        status: "active",
      };
    },
  };

  const fetchStub = sandbox().stub(Fetch, "fetch").resolves(fakeResponse);
  await createSubscription({
    stripeCustomerId: "cus_123",
    stripeSourceId: "source_123",
    stripePrices: [
      {
        planId: "a-plan-id",
        stripePriceId: "a-stripe-price-id",
        type: PlanStripePriceType.BASE_COST,
      },
      {
        planId: "a-plan-id",
        stripePriceId: "another-stripe-price-id",
        type: PlanStripePriceType.PER_SEAT,
      },
    ],
    seatCount: 2,
  });

  t.equal(fetchStub.callCount, 1);
  t.equal(
    fetchStub.firstCall.args[0],
    "https://api.stripe.com/v1/subscriptions"
  );
  t.equal(fetchStub.firstCall.args[1].method, "post");
  t.equal(
    fetchStub.firstCall.args[1].body,
    "items[0][price]=a-stripe-price-id&items[1][price]=another-stripe-price-id&items[1][quantity]=2&customer=cus_123&default_source=source_123"
  );
});

test("createSubscription with invalid PER_SEAT <-> seatCount", async (t: Test) => {
  try {
    await createSubscription({
      stripeCustomerId: "cus_123",
      stripeSourceId: "source_123",
      stripePrices: [
        {
          planId: "a-plan-id",
          stripePriceId: "another-stripe-price-id",
          type: PlanStripePriceType.PER_SEAT,
        },
      ],
      seatCount: null,
    });
    t.fail("should not succeed");
  } catch (err) {
    t.pass("throws an error");
  }
});

test("createSubscription allows calling with null source", async (t: Test) => {
  const fakeResponse = {
    headers: {
      get(): string {
        return "application/json";
      },
    },
    status: 200,
    json(): object {
      return {
        id: "sub_123",
        status: "active",
      };
    },
  };

  const fetchStub = sandbox().stub(Fetch, "fetch").resolves(fakeResponse);
  await createSubscription({
    stripeCustomerId: "cus_123",
    stripePrices: [
      {
        planId: "a-plan-id",
        stripePriceId: "another-stripe-price-id",
        type: PlanStripePriceType.BASE_COST,
      },
    ],
    stripeSourceId: null,
    seatCount: null,
  });

  t.equal(
    fetchStub.firstCall.args[1].body,
    "items[0][price]=another-stripe-price-id&customer=cus_123"
  );
});

test("createSubscription fails if marked incomplete", async (t: Test) => {
  const fakeResponse = {
    headers: {
      get(): string {
        return "application/json";
      },
    },
    status: 200,
    json(): object {
      return {
        id: "sub_123",
        status: "incomplete",
      };
    },
  };

  sandbox().stub(Fetch, "fetch").resolves(fakeResponse);

  try {
    await createSubscription({
      stripeCustomerId: "cus_123",
      stripeSourceId: "source_123",
      stripePrices: [],
      seatCount: null,
    });
    throw new Error("Shouldn't get here");
  } catch (err) {
    t.equal(err.message, "Failed to charge card for this subscription");
  }
});
