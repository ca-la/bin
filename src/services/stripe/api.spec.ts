import { sandbox, test } from "../../test-helpers/fresh";
import { Test } from "tape";
import {
  getInvoicesAfterSpecified,
  retrieveUpcomingInvoice,
  StripeInvoice,
} from "./api";
import * as MakeRequest from "./make-request";

test("getInvoicesAfterSpecified", async (t: Test) => {
  const correctResult = {
    object: "list",
    data: [],
    has_more: false,
  };
  const makeRequestStub = sandbox()
    .stub(MakeRequest, "default")
    .resolves(correctResult);

  const result = await getInvoicesAfterSpecified("in_1");
  t.deepEqual(result, correctResult, "Returns correct result");

  t.deepEqual(
    makeRequestStub.args,
    [
      [
        {
          method: "get",
          path: "/invoices?ending_before=in_1&limit=100",
        },
      ],
    ],
    "Calls makeRequest with correct arguments"
  );

  makeRequestStub.resolves({
    ...correctResult,
    object: "not_list",
  });

  try {
    await getInvoicesAfterSpecified("in_1");
    t.fail("Expected an error if the returned result mismatch expected schema");
  } catch (err) {
    t.pass("Throws an error if the returned result mismatch expected schema");
  }
});

test("retrieveUpcomingInvoice", async (t: Test) => {
  const correctResult: StripeInvoice = {
    object: "invoice",
    subtotal: 100_00,
    total: 100_00,
    status: "draft",
    subscription_proration_date: Math.round(
      new Date(2012, 11, 24).getTime() / 1000
    ),
  };
  const makeRequestStub = sandbox()
    .stub(MakeRequest, "default")
    .resolves(correctResult);

  const result = await retrieveUpcomingInvoice({
    subscription: "a-stripe-subscription-id",
    subscription_items: [],
    subscription_proration_behavior: "always_invoice",
    subscription_proration_date: new Date(2012, 11, 24),
  });
  t.deepEqual(result, correctResult, "Returns correct result");

  t.deepEqual(
    makeRequestStub.args,
    [
      [
        {
          method: "get",
          path: `/invoices/upcoming?subscription=a-stripe-subscription-id&subscription_proration_behavior=always_invoice&subscription_proration_date=${Math.round(
            new Date(2012, 11, 24).getTime() / 1000
          )}`,
        },
      ],
    ],
    "Calls makeRequest with correct arguments"
  );

  makeRequestStub.resolves({
    ...correctResult,
    object: "not_invoice",
  });

  try {
    await retrieveUpcomingInvoice({
      subscription: "a-stripe-subscription-id",
      subscription_items: [],
      subscription_proration_behavior: "always_invoice",
      subscription_proration_date: new Date(2012, 11, 24),
    });
    t.fail("Expected an error if the returned result mismatch expected schema");
  } catch (err) {
    t.pass("Throws an error if the returned result mismatch expected schema");
  }
});
