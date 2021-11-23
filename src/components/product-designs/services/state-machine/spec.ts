import { test, Test, sandbox } from "../../../../test-helpers/simple";
import { PricingCostInput } from "../../../pricing-cost-inputs/types";
import {
  Complexity,
  MaterialCategory,
  ProductType,
} from "../../../../domain-objects/pricing";
import { DesignEvent, templateDesignEvent } from "../../../design-events/types";

import { DesignState, determineState } from "./index";

const testDate = new Date("2019-12-31");
const expirationDate = new Date("2020-01-01");
const afterExpirationDate = new Date("2020-01-02");

function setup() {
  const clock = sandbox().useFakeTimers(testDate);
  const costInput: PricingCostInput = {
    id: "active-pricing-cost-input",
    createdAt: new Date(),
    deletedAt: null,
    designId: "a-design-id",
    productType: ProductType.PANTS,
    productComplexity: Complexity.COMPLEX,
    materialCategory: MaterialCategory.SPECIFY,
    materialBudgetCents: 10000,
    minimumOrderQuantity: 1,
    processes: [],
    careLabelsVersion: 0,
    constantsVersion: 0,
    marginVersion: 0,
    processTimelinesVersion: 0,
    processesVersion: 0,
    productMaterialsVersion: 0,
    productTypeVersion: 0,
    unitMaterialMultipleVersion: 0,
    expiresAt: expirationDate,
  };

  const submit: DesignEvent = {
    ...templateDesignEvent,
    designId: "a-design-id",
    actorId: "a-user-id",
    id: "design-event-submit",
    createdAt: new Date("2019-04-20"),
    type: "SUBMIT_DESIGN",
  };

  const commitCosts: DesignEvent = {
    ...templateDesignEvent,
    designId: "a-design-id",
    actorId: "a-user-id",
    id: "design-event-commit-costs",
    createdAt: new Date("2019-04-21"),
    type: "COMMIT_COST_INPUTS",
  };
  const commitQuote: DesignEvent = {
    ...templateDesignEvent,
    designId: "a-design-id",
    actorId: "a-user-id",
    id: "design-event-commit-quote",
    createdAt: new Date("2019-04-22"),
    type: "COMMIT_QUOTE",
  };
  const commitPartners: DesignEvent = {
    ...templateDesignEvent,
    designId: "a-design-id",
    actorId: "a-user-id",
    id: "design-event-commit-partners",
    createdAt: new Date("2019-04-24"),
    type: "COMMIT_PARTNER_PAIRING",
  };
  const reject: DesignEvent = {
    ...templateDesignEvent,
    designId: "a-design-id",
    actorId: "a-user-id",
    id: "design-event-reject",
    createdAt: new Date("2019-04-25"),
    type: "REJECT_DESIGN",
  };
  const reverseCheckout: DesignEvent = {
    ...templateDesignEvent,
    designId: "a-design-id",
    actorId: "a-user-id",
    id: "design-event-reverse-checkout",
    createdAt: new Date("2019-04-26"),
    type: "REVERSE_CHECKOUT",
  };

  return {
    clock,
    costInputs: [costInput],
    events: {
      submit,
      reject,
      commitCosts,
      commitQuote,
      commitPartners,
      reverseCheckout,
    },
  };
}

test("determineState works for designs with no events or cost inputs", async (t: Test) => {
  const state = determineState({
    id: "a-design-id",
    costInputs: [],
    events: [],
  });
  t.deepEqual(state, DesignState.INITIAL, "Sits at pre-submission state");
});

test("determineState: SUBMIT", async (t: Test) => {
  const { costInputs, events, clock } = setup();

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs,
      events: [events.submit],
    }),
    DesignState.SUBMITTED,
    "INITIAL to SUBMITTED state"
  );

  clock.setSystemTime(afterExpirationDate);

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs,
      events: [events.submit],
    }),
    DesignState.SUBMITTED,
    "expired: SUBMITTED"
  );
});

test("determineState: SUBMIT -> REJECT", async (t: Test) => {
  const { costInputs, clock, events } = setup();

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs,
      events: [events.submit, events.reject],
    }),
    DesignState.INITIAL,
    "INITIAL -> SUBMITTED -> INITIAL"
  );

  clock.setSystemTime(afterExpirationDate);

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs,
      events: [events.submit, events.reject],
    }),
    DesignState.INITIAL,
    "expired: INITIAL"
  );
});

test("determineState: SUBMIT -> COST", async (t: Test) => {
  const { costInputs, clock, events } = setup();

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs,
      events: [events.submit, events.commitCosts],
    }),
    DesignState.COSTED,
    "INITIAL -> COSTED"
  );

  clock.setSystemTime(afterExpirationDate);

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs,
      events: [events.submit, events.commitCosts],
    }),
    DesignState.INITIAL,
    "expired: INITIAL"
  );
});

test("determineState: SUBMIT -> COST -> REJECT", async (t: Test) => {
  const { costInputs, clock, events } = setup();

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs,
      events: [events.submit, events.commitCosts, events.reject],
    }),
    DesignState.INITIAL,
    "INITIAL -> SUBMITTED -> COSTED -> INITIAL"
  );

  clock.setSystemTime(afterExpirationDate);

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs,
      events: [events.submit, events.commitCosts, events.reject],
    }),
    DesignState.INITIAL,
    "expired: INITIAL"
  );
});

test("determineState: SUBMIT -> COST -> REJECT -> SUBMIT", async (t: Test) => {
  const { costInputs, clock, events } = setup();

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs,
      events: [events.submit, events.commitCosts, events.reject, events.submit],
    }),
    DesignState.SUBMITTED,
    "INITIAL -> SUBMITTED -> COSTED -> INITIAL -> SUBMITTED"
  );

  clock.setSystemTime(afterExpirationDate);

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs,
      events: [events.submit, events.commitCosts, events.reject, events.submit],
    }),
    DesignState.SUBMITTED,
    "expired: SUBMITTED"
  );
});

test("determineState: SUBMIT -> REJECT -> SUBMIT -> COST", async (t: Test) => {
  const { costInputs, clock, events } = setup();

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs,
      events: [events.submit, events.reject, events.submit, events.commitCosts],
    }),
    DesignState.COSTED,
    "INITIAL -> SUBMITTED -> INITIAL -> COSTED"
  );

  clock.setSystemTime(afterExpirationDate);

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs,
      events: [events.submit, events.reject, events.submit, events.commitCosts],
    }),
    DesignState.INITIAL,
    "expired: INITIAL"
  );
});

test("determineState: SUBMIT -> COST -> CHECKOUT", async (t: Test) => {
  const { costInputs, clock, events } = setup();

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs,
      events: [events.submit, events.commitCosts, events.commitQuote],
    }),
    DesignState.CHECKED_OUT,
    "INITIAL -> COSTED -> CHECKED_OUT"
  );

  clock.setSystemTime(afterExpirationDate);

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs,
      events: [events.submit, events.commitCosts, events.commitQuote],
    }),
    DesignState.CHECKED_OUT,
    "expired: CHECKED_OUT"
  );
});

test("determineState: SUBMIT -> COST -> CHECKOUT -> COST", async (t: Test) => {
  const { costInputs, clock, events } = setup();

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs,
      events: [
        events.submit,
        events.commitCosts,
        events.commitQuote,
        events.reverseCheckout,
      ],
    }),
    DesignState.COSTED,
    "INITIAL -> COSTED -> CHECKED_OUT -> COST"
  );

  clock.setSystemTime(afterExpirationDate);

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs,
      events: [
        events.submit,
        events.commitCosts,
        events.commitQuote,
        events.reverseCheckout,
      ],
    }),
    DesignState.INITIAL,
    "expired: INITIAL"
  );
});

test("determineState: SUBMIT -> COST -> CHECKOUT -> PAIRED", async (t: Test) => {
  const { costInputs, clock, events } = setup();

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs,
      events: [
        events.submit,
        events.commitCosts,
        events.commitQuote,
        events.commitPartners,
      ],
    }),
    DesignState.PAIRED,
    "INITIAL -> COSTED -> CHECKED_OUT -> PAIRED"
  );

  clock.setSystemTime(afterExpirationDate);

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs,
      events: [
        events.submit,
        events.commitCosts,
        events.commitQuote,
        events.commitPartners,
      ],
    }),
    DesignState.PAIRED,
    "expired: PAIRED"
  );
});
