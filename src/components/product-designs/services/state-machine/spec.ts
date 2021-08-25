import { test, Test } from "../../../../test-helpers/simple";
import { PricingCostInput } from "../../../pricing-cost-inputs/types";
import {
  Complexity,
  MaterialCategory,
  ProductType,
} from "../../../../domain-objects/pricing";
import { DesignEvent, templateDesignEvent } from "../../../design-events/types";

import { DesignState, determineState } from "./index";

function setup() {
  const active: PricingCostInput = {
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
    expiresAt: null,
  };
  const expired: PricingCostInput = {
    ...active,
    expiresAt: new Date("2019-04-23"),
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

  return {
    costInputs: {
      active,
      expired,
    },
    events: {
      submit,
      reject,
      commitCosts,
      commitQuote,
      commitPartners,
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
  const { costInputs, events } = setup();

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs: [costInputs.active],
      events: [events.submit],
    }),
    DesignState.SUBMITTED,
    "INITIAL to SUBMITTED state"
  );

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs: [costInputs.expired],
      events: [events.submit],
    }),
    DesignState.SUBMITTED,
    "expired: SUBMITTED"
  );
});

test("determineState: SUBMIT -> REJECT", async (t: Test) => {
  const { costInputs, events } = setup();

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs: [costInputs.active],
      events: [events.submit, events.reject],
    }),
    DesignState.INITIAL,
    "INITIAL -> SUBMITTED -> INITIAL"
  );

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs: [costInputs.expired],
      events: [events.submit, events.reject],
    }),
    DesignState.INITIAL,
    "expired: INITIAL"
  );
});

test("determineState: SUBMIT -> COST", async (t: Test) => {
  const { costInputs, events } = setup();

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs: [costInputs.active],
      events: [events.submit, events.commitCosts],
    }),
    DesignState.COSTED,
    "INITIAL -> COSTED"
  );

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs: [costInputs.expired],
      events: [events.submit, events.commitCosts],
    }),
    DesignState.INITIAL,
    "expired: INITIAL"
  );
});

test("determineState: SUBMIT -> COST -> REJECT", async (t: Test) => {
  const { costInputs, events } = setup();

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs: [costInputs.active],
      events: [events.submit, events.commitCosts, events.reject],
    }),
    DesignState.INITIAL,
    "INITIAL -> SUBMITTED -> COSTED -> INITIAL"
  );

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs: [costInputs.expired],
      events: [events.submit, events.commitCosts, events.reject],
    }),
    DesignState.INITIAL,
    "expired: INITIAL"
  );
});

test("determineState: SUBMIT -> COST -> REJECT -> SUBMIT", async (t: Test) => {
  const { costInputs, events } = setup();

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs: [costInputs.active],
      events: [events.submit, events.commitCosts, events.reject, events.submit],
    }),
    DesignState.SUBMITTED,
    "INITIAL -> SUBMITTED -> COSTED -> INITIAL -> SUBMITTED"
  );

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs: [costInputs.expired],
      events: [events.submit, events.commitCosts, events.reject, events.submit],
    }),
    DesignState.SUBMITTED,
    "expired: SUBMITTED"
  );
});

test("determineState: SUBMIT -> REJECT -> SUBMIT -> COST", async (t: Test) => {
  const { costInputs, events } = setup();

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs: [costInputs.active],
      events: [events.submit, events.reject, events.submit, events.commitCosts],
    }),
    DesignState.COSTED,
    "INITIAL -> SUBMITTED -> INITIAL -> COSTED"
  );

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs: [costInputs.expired],
      events: [events.submit, events.reject, events.submit, events.commitCosts],
    }),
    DesignState.INITIAL,
    "expired: INITIAL"
  );
});

test("determineState: SUBMIT -> COST -> CHECKOUT", async (t: Test) => {
  const { costInputs, events } = setup();

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs: [costInputs.active],
      events: [events.submit, events.commitCosts, events.commitQuote],
    }),
    DesignState.CHECKED_OUT,
    "INITIAL -> COSTED -> CHECKED_OUT"
  );

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs: [costInputs.expired],
      events: [events.submit, events.commitCosts, events.commitQuote],
    }),
    DesignState.CHECKED_OUT,
    "expired: CHECKED_OUT"
  );
});

test("determineState: SUBMIT -> COST -> CHECKOUT -> PAIRED", async (t: Test) => {
  const { costInputs, events } = setup();

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs: [costInputs.active],
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

  t.deepEqual(
    determineState({
      id: "a-design-id",
      costInputs: [costInputs.expired],
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
