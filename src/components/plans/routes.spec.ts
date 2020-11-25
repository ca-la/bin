import uuid from "node-uuid";

import * as PlansDAO from "./dao";
import { Plan, BillingInterval } from "./plan";
import { authHeader, get, post } from "../../test-helpers/http";
import { test, Test, sandbox } from "../../test-helpers/fresh";
import { Role as UserRole } from "../users/domain-object";
import SessionsDAO from "../../dao/sessions";

const now = new Date();
const planDataToCreate: Unsaved<Plan> = {
  isPublic: false,
  ordering: null,
  monthlyCostCents: 500000,
  stripePlanId: "plan_FeBI1CSrMOAqHs",
  title: "Uncapped",
  isDefault: false,
  billingInterval: BillingInterval.ANNUALLY,
  description: "Everything you need to launch a multi-million dollar brand.",
  revenueShareBasisPoints: 4000,
  costOfGoodsShareBasisPoints: 0,
};
const createdPlan: Plan = {
  ...planDataToCreate,
  id: "a-plan-id",
  createdAt: now,
  // all created plans should be private
  isPublic: false,
  // private plans should have no ordering
  ordering: null,
};

const firstPlan = {
  id: uuid.v4(),
  billingInterval: BillingInterval.MONTHLY,
  monthlyCostCents: 7890,
  revenueShareBasisPoints: 1234,
  costOfGoodsShareBasisPoints: 5678,
  stripePlanId: "plan_789",
  title: "The First One",
  isDefault: false,
  isPublic: true,
  description: "The First One",
  ordering: 1,
};

const secretPlan = {
  id: uuid.v4(),
  billingInterval: BillingInterval.MONTHLY,
  monthlyCostCents: 4567,
  revenueShareBasisPoints: 1234,
  costOfGoodsShareBasisPoints: 5678,
  stripePlanId: "plan_456",
  title: "The Secret One",
  isDefault: false,
  isPublic: false,
  description: "The Secret One",
  ordering: null,
};

const littleBitPlan = {
  id: uuid.v4(),
  billingInterval: BillingInterval.MONTHLY,
  monthlyCostCents: 1234,
  revenueShareBasisPoints: 1234,
  costOfGoodsShareBasisPoints: 5678,
  stripePlanId: "plan_123",
  title: "A little Bit",
  isDefault: false,
  isPublic: false,
  description: null,
  ordering: null,
};

function setup({ role = "USER" }: { role?: UserRole } = {}) {
  sandbox().useFakeTimers(now);
  sandbox().stub(uuid, "v4").returns("a-plan-id");
  return {
    sessionsStub: sandbox().stub(SessionsDAO, "findById").resolves({
      role,
      userId: "a-user-id",
    }),
    createStub: sandbox().stub(PlansDAO, "create").resolves(createdPlan),
    findPublicStub: sandbox()
      .stub(PlansDAO, "findPublic")
      .resolves([firstPlan, littleBitPlan]),
    findAllStub: sandbox()
      .stub(PlansDAO, "findAll")
      .resolves([firstPlan, secretPlan, littleBitPlan]),
    findByIdStub: sandbox().stub(PlansDAO, "findById").resolves(littleBitPlan),
  };
}

test("GET /plans lists public plans in order", async (t: Test) => {
  setup();

  const [response, body] = await get("/plans");

  t.equal(response.status, 200);

  t.equal(body.length, 2);
  t.equal(body[0].title, "The First One");
  t.equal(body[0].monthlyCostCents, 7890);
  t.equal(body[0].revenueShareBasisPoints, 1234);

  t.equal(body[1].title, "A little Bit");
  t.equal(body[1].monthlyCostCents, 1234);
});

test("GET /plans/:id returns a plan", async (t: Test) => {
  const { findByIdStub } = setup();

  const [response, body] = await get(`/plans/${littleBitPlan.id}`);

  t.equal(response.status, 200);

  t.deepEqual(body, JSON.parse(JSON.stringify(littleBitPlan)), "Returns plan");
  t.deepEqual(findByIdStub.args[0][1], littleBitPlan.id, "Finds plan by id");
});

test("GET /plans/:id returns 404 when non-existent", async (t: Test) => {
  sandbox().stub(PlansDAO, "findById").resolves(null);

  const [response, body] = await get(
    "/plans/00000000-0000-0000-0000-000000000000"
  );

  t.equal(response.status, 404);
  t.equal(body.message, "Plan not found");
});

test("GET /plans?withPrivate=true returns all plans for admins", async (t: Test) => {
  const { sessionsStub } = setup({ role: "ADMIN" });

  const [adminResponse, adminBody] = await get("/plans?withPrivate=true", {
    headers: authHeader("a-session-id"),
  });

  t.equal(adminResponse.status, 200);
  t.equal(adminBody.length, 3);
  t.deepEqual(
    adminBody,
    JSON.parse(JSON.stringify([firstPlan, secretPlan, littleBitPlan])),
    "returns public and private plans"
  );

  sessionsStub.resolves(null);
  const [userResponse] = await get("/plans?withPrivate=true");

  t.equal(userResponse.status, 403);
});

test("POST /plans valid for the admin", async (t: Test) => {
  const { createStub } = setup({ role: "ADMIN" });

  const [response, body] = await post("/plans", {
    headers: authHeader("a-session-id"),
    body: {
      monthlyCostCents: 500000,
      stripePlanId: "plan_FeBI1CSrMOAqHs",
      title: "Uncapped",
      isDefault: false,
      billingInterval: "ANNUALLY",
      isPublic: false,
      description:
        "Everything you need to launch a multi-million dollar brand.",
      ordering: 4,
      revenueShareBasisPoints: 4000,
      costOfGoodsShareBasisPoints: 0,
    },
  });

  t.equal(response.status, 201);
  t.deepEqual(
    body,
    JSON.parse(JSON.stringify(createdPlan)),
    "returns the created plan from the DAO"
  );
  t.deepEqual(
    createStub.args[0][1],
    planDataToCreate,
    "calls create with the correct values"
  );
});

test("POST /plans invalid for regular user", async (t: Test) => {
  setup({ role: "USER" });

  const [invalid] = await post("/plans", {
    headers: authHeader("a-session-id"),
    body: {
      monthlyCostCents: 500000,
      stripePlanId: "plan_FeBI1CSrMOAqHs",
      title: "Uncapped",
      isDefault: false,
      billingInterval: "ANNUALLY",
      isPublic: false,
      description:
        "Everything you need to launch a multi-million dollar brand.",
      ordering: 4,
      revenueShareBasisPoints: 4000,
      costOfGoodsShareBasisPoints: 0,
    },
  });

  t.equal(invalid.status, 403, "Requires an admin role");
});

test("POST /plans invalid for unauthenticated user", async (t: Test) => {
  const { sessionsStub } = setup();

  sessionsStub.resolves(null);

  const [unauthenticated] = await post("/plans", {
    headers: authHeader("a-session-id"),
    body: {
      monthlyCostCents: 500000,
      stripePlanId: "plan_FeBI1CSrMOAqHs",
      title: "Uncapped",
      isDefault: false,
      billingInterval: "ANNUALLY",
      isPublic: false,
      description:
        "Everything you need to launch a multi-million dollar brand.",
      ordering: 4,
      revenueShareBasisPoints: 4000,
      costOfGoodsShareBasisPoints: 0,
    },
  });

  t.equal(unauthenticated.status, 403, "Does not allow unauthenticated users");
});

test("POST /plans invalid without required fields", async (t: Test) => {
  setup({ role: "ADMIN" });

  const [invalid] = await post("/plans", {
    headers: authHeader("a-session-id"),
    body: {
      stripePlanId: "plan_FeBI1CSrMOAqHs",
      title: "Uncapped",
      isDefault: false,
      billingInterval: "ANNUALLY",
      isPublic: false,
      description:
        "Everything you need to launch a multi-million dollar brand.",
      ordering: 4,
      revenueShareBasisPoints: 4000,
      costOfGoodsShareBasisPoints: 0,
    },
  });

  t.equal(
    invalid.status,
    400,
    "Responds with invalid if body doesn't have monthlyCostCents"
  );
});

test("POST /plans invalid without body", async (t: Test) => {
  setup({ role: "ADMIN" });

  const [invalid] = await post("/plans", {
    headers: authHeader("a-session-id"),
  });

  t.equal(invalid.status, 400, "Responds with invalid");
});

test("POST /plans creates only private plan even if we ask for public", async (t: Test) => {
  setup({ role: "ADMIN" });

  const [response, body] = await post("/plans", {
    headers: authHeader("a-session-id"),
    body: {
      monthlyCostCents: 500000,
      stripePlanId: "plan_FeBI1CSrMOAqHs",
      title: "Uncapped",
      isDefault: false,
      billingInterval: "ANNUALLY",
      isPublic: true,
      description:
        "Everything you need to launch a multi-million dollar brand.",
      ordering: 4,
      revenueShareBasisPoints: 4000,
      costOfGoodsShareBasisPoints: 0,
    },
  });

  t.equal(response.status, 201);
  t.equal(body.isPublic, false, "Responds with private plan");
  t.equal(body.ordering, null, "Private plan has no ordering");
});

test("POST /plans valid for MONTHLY and ANNUALLY billing interval and invalid for other values", async (t: Test) => {
  const planBody = {
    monthlyCostCents: 500000,
    stripePlanId: "plan_FeBI1CSrMOAqHs",
    title: "Uncapped",
    isDefault: false,
    billingInterval: "ANNUALLY",
    isPublic: false,
    description: "Everything you need to launch a multi-million dollar brand.",
    ordering: null,
    revenueShareBasisPoints: 4000,
    costOfGoodsShareBasisPoints: 0,
  };

  setup({ role: "ADMIN" });

  const [annualPlanResponse] = await post("/plans", {
    headers: authHeader("a-session-id"),
    body: {
      ...planBody,
      billingInterval: "ANNUALLY",
    },
  });
  t.equal(
    annualPlanResponse.status,
    201,
    "ANNUALLY billing interval is allowed"
  );

  const [monthlyPlanResponse] = await post("/plans", {
    headers: authHeader("a-session-id"),
    body: {
      ...planBody,
      billingInterval: "MONTHLY",
    },
  });
  t.equal(
    monthlyPlanResponse.status,
    201,
    "MONTHLY billing interval is allowed"
  );

  const [invalidBillingPlanResponse] = await post("/plans", {
    headers: authHeader("a-session-id"),
    body: {
      ...planBody,
      billingInterval: "PER_MINUTE",
    },
  });
  t.equal(
    invalidBillingPlanResponse.status,
    400,
    "Responds with invalid if billingInterval is incorrect"
  );
});
