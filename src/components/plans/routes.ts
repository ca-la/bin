import Router from "koa-router";

import * as PlansDAO from "./dao";
import requireAdmin = require("../../middleware/require-admin");
import { Plan } from "./plan";
import { isCreatePlanInputRequest } from "./domain-object";
import { typeGuard } from "../../middleware/type-guard";

const router = new Router();

function* getPlans(this: AuthedContext): Iterator<any, any, any> {
  const { withPrivate } = this.query;
  const isAdmin = this.state.role === "ADMIN";

  if (!isAdmin && withPrivate) {
    this.throw(403, "Private plans cannot be listed.");
  }

  const plans = withPrivate
    ? yield PlansDAO.findAll()
    : yield PlansDAO.findPublic();

  this.status = 200;
  this.body = plans;
}

function* getById(this: AuthedContext): Iterator<any, any, any> {
  const plan = yield PlansDAO.findById(this.params.planId);
  if (!plan) {
    this.throw(404, "Plan not found");
  }
  this.status = 200;
  this.body = plan;
}

function* createPlan(
  this: AuthedContext<Unsaved<Plan>>
): Iterator<any, any, any> {
  const {
    billingInterval,
    monthlyCostCents,
    revenueShareBasisPoints,
    costOfGoodsShareBasisPoints,
    stripePlanId,
    title,
    isDefault,
    description,
  } = this.request.body;

  const createdPlan = yield PlansDAO.create({
    // we don't allow people to create public plans via this API in general
    // those are very visible and it would be very bad if someone accidentally made one
    isPublic: false,
    // ordering for private plans should be null
    ordering: null,
    billingInterval,
    monthlyCostCents,
    revenueShareBasisPoints,
    costOfGoodsShareBasisPoints,
    stripePlanId,
    title,
    isDefault,
    description,
  });
  this.status = 201;
  this.body = createdPlan;
}

router.get("/", getPlans);
router.get("/:planId", getById);
router.post("/", requireAdmin, typeGuard(isCreatePlanInputRequest), createPlan);

export default router.routes();
