import Router from "koa-router";

import * as PlansDAO from "./dao";
import * as PlanStripePricesDAO from "../plan-stripe-price/dao";
import requireAdmin = require("../../middleware/require-admin");
import useTransaction from "../../middleware/use-transaction";
import { CreatePlanRequest, createPlanRequestSchema, Plan } from "./types";
import { typeGuard } from "../../middleware/type-guard";
import { PlanStripePriceType } from "../plan-stripe-price/types";
import { check } from "../../services/check";

const router = new Router();

function* getPlans(this: TrxContext<AuthedContext>): Iterator<any, any, any> {
  const { withPrivate } = this.query;
  const { trx, role } = this.state;
  const isAdmin = role === "ADMIN";

  if (!isAdmin && withPrivate) {
    this.throw(403, "Private plans cannot be listed.");
  }

  const plans = withPrivate
    ? yield PlansDAO.findAll(trx)
    : yield PlansDAO.findPublic(trx);

  this.status = 200;
  this.body = plans;
}

function* getById(this: TrxContext<AuthedContext>): Iterator<any, any, any> {
  const { trx } = this.state;

  const plan = yield PlansDAO.findById(trx, this.params.planId);
  if (!plan) {
    this.throw(404, "Plan not found");
  }
  this.status = 200;
  this.body = plan;
}

function* createPlan(
  this: TrxContext<AuthedContext<Unsaved<Plan>>>
): Iterator<any, any, any> {
  const {
    billingInterval,
    revenueShareBasisPoints,
    costOfGoodsShareBasisPoints,
    stripePlanId,
    title,
    isDefault,
    description,
    baseCostPerBillingIntervalCents,
    perSeatCostPerBillingIntervalCents,
    canCheckOut,
    canSubmit,
    maximumSeatsPerTeam,
    includesFulfillment,
    upgradeToPlanId,
  } = this.request.body;

  const { trx } = this.state;

  // TODO: Safe to remove after this column is dropped, just kept temporarily
  // for backwards compatibility.
  const monthlyCostCents =
    billingInterval === "MONTHLY"
      ? baseCostPerBillingIntervalCents
      : Math.ceil(baseCostPerBillingIntervalCents / 12);

  const createdPlan = yield PlansDAO.create(trx, {
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
    baseCostPerBillingIntervalCents,
    perSeatCostPerBillingIntervalCents,
    canCheckOut,
    canSubmit,
    maximumSeatsPerTeam,
    includesFulfillment,
    upgradeToPlanId,
  });
  yield PlanStripePricesDAO.create(trx, {
    planId: createdPlan.id,
    stripePriceId: stripePlanId,
    type: PlanStripePriceType.BASE_COST,
  });
  this.status = 201;
  this.body = createdPlan;
}

router.get("/", useTransaction, getPlans);
router.get("/:planId", useTransaction, getById);
router.post(
  "/",
  requireAdmin,
  typeGuard((candidate: any): candidate is CreatePlanRequest =>
    check(createPlanRequestSchema, candidate)
  ),
  useTransaction,
  createPlan
);

export default router.routes();
