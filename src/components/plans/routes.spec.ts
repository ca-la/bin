import uuid from "node-uuid";
import { omit } from "lodash";

import * as PlansDAO from "./dao";
import { Plan } from "./plan";
import { authHeader, get } from "../../test-helpers/http";
import { test, Test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";

test("GET /plans lists public plans in order", async (t: Test) => {
  await PlansDAO.create({
    id: uuid.v4(),
    billingInterval: "MONTHLY",
    monthlyCostCents: 1234,
    revenueShareBasisPoints: 1234,
    costOfGoodsShareBasisPoints: 5678,
    stripePlanId: "plan_123",
    title: "The Second One",
    isDefault: true,
    isPublic: true,
    description: "The Second One",
    ordering: 2,
  });

  await PlansDAO.create({
    id: uuid.v4(),
    billingInterval: "MONTHLY",
    monthlyCostCents: 4567,
    revenueShareBasisPoints: 1234,
    costOfGoodsShareBasisPoints: 5678,
    stripePlanId: "plan_456",
    title: "The Secret One",
    isDefault: false,
    isPublic: false,
    description: "The Secret One",
    ordering: null,
  });

  await PlansDAO.create({
    id: uuid.v4(),
    billingInterval: "MONTHLY",
    monthlyCostCents: 7890,
    revenueShareBasisPoints: 1234,
    costOfGoodsShareBasisPoints: 5678,
    stripePlanId: "plan_789",
    title: "The First One",
    isDefault: false,
    isPublic: true,
    description: "The First One",
    ordering: 1,
  });

  const [response, body] = await get("/plans");

  t.equal(response.status, 200);

  t.equal(body.length, 2);
  t.equal(body[0].title, "The First One");
  t.equal(body[0].monthlyCostCents, 7890);
  t.equal(body[0].revenueShareBasisPoints, 1234);

  t.equal(body[1].title, "The Second One");
  t.equal(body[1].monthlyCostCents, 1234);
});

test("GET /plans/:id returns a plan", async (t: Test) => {
  const planData: Uninserted<Plan> = {
    id: uuid.v4(),
    billingInterval: "MONTHLY",
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

  const plan = await PlansDAO.create(planData);

  const [response, body] = await get(`/plans/${plan.id}`);

  t.equal(response.status, 200);

  t.deepEqual(omit(body, "createdAt"), planData);
});

test("GET /plans/:id returns 404 when non-existent", async (t: Test) => {
  await PlansDAO.create({
    id: uuid.v4(),
    billingInterval: "MONTHLY",
    monthlyCostCents: 1234,
    revenueShareBasisPoints: 1234,
    costOfGoodsShareBasisPoints: 5678,
    stripePlanId: "plan_123",
    title: "A little Bit",
    isDefault: false,
    isPublic: true,
    ordering: 1,
    description: null,
  });

  const [response, body] = await get(
    "/plans/00000000-0000-0000-0000-000000000000"
  );

  t.equal(response.status, 404);
  t.equal(body.message, "Plan not found");
});

test("GET /plans?includePrivate=true returns all plans for admins", async (t: Test) => {
  const publicPlan = await PlansDAO.create({
    id: uuid.v4(),
    billingInterval: "MONTHLY",
    monthlyCostCents: 1234,
    revenueShareBasisPoints: 1234,
    costOfGoodsShareBasisPoints: 5678,
    stripePlanId: "plan_123",
    title: "A little Bit",
    isDefault: false,
    isPublic: true,
    ordering: 1,
    description: null,
  });

  const privatePlan = await PlansDAO.create({
    id: uuid.v4(),
    billingInterval: "MONTHLY",
    monthlyCostCents: 1000,
    revenueShareBasisPoints: 1234,
    costOfGoodsShareBasisPoints: 5678,
    stripePlanId: "plan_456",
    title: "A little bit more",
    isDefault: false,
    isPublic: false,
    ordering: null,
    description: null,
  });

  const { session } = await createUser({ role: "ADMIN" });

  const [adminResponse, adminBody] = await get("/plans?withPrivate=true", {
    headers: authHeader(session.id),
  });

  t.equal(adminResponse.status, 200);
  t.equal(adminBody.length, 2);
  t.equal(adminBody[0].id, publicPlan.id);
  t.equal(adminBody[1].id, privatePlan.id);

  const [userResponse] = await get("/plans?withPrivate=true");

  t.equal(userResponse.status, 403);
});
