import Router from "koa-router";

import * as PlansDAO from "./dao";
import TeamUsersDAO from "../team-users/dao";
import requireAdmin = require("../../middleware/require-admin");
import useTransaction from "../../middleware/use-transaction";
import {
  CreatePlanRequest,
  createPlanRequestSchema,
  Plan,
  TeamPlanOption,
} from "./types";
import { attachTeamOptionData } from "./find-team-plans";
import { typeGuard } from "../../middleware/type-guard";
import { PlanStripePriceType } from "../plan-stripe-price/types";
import { check } from "../../services/check";
import { createPlan } from "./create-plan";

const router = new Router();

function* getPlans(this: TrxContext<AuthedContext>): Iterator<any, any, any> {
  const { withPrivate, teamId } = this.query;
  const { trx, role } = this.state;
  const isAdmin = role === "ADMIN";

  if (!isAdmin && withPrivate) {
    this.throw(403, "Private plans cannot be listed.");
  }

  let plans = withPrivate
    ? yield PlansDAO.findAll(trx)
    : yield PlansDAO.findPublic(trx);

  if (teamId) {
    const billedUserCount = yield TeamUsersDAO.countBilledUsers(trx, teamId);
    plans = plans.map(
      (plan: Plan): TeamPlanOption =>
        attachTeamOptionData(plan, billedUserCount)
    );
  }

  this.status = 200;
  this.body = plans;
}

function* getById(this: TrxContext<AuthedContext>): Iterator<any, any, any> {
  const { trx } = this.state;
  const { teamId } = this.query;

  let plan = yield PlansDAO.findById(trx, this.params.planId);

  if (!plan) {
    this.throw(404, "Plan not found");
  }

  if (teamId) {
    const billedUserCount = yield TeamUsersDAO.countBilledUsers(trx, teamId);
    plan = attachTeamOptionData(plan, billedUserCount);
  }

  this.status = 200;
  this.body = plan;
}

function* create(
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

  const createdPlan = yield createPlan(
    trx,
    {
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
    },
    [{ stripePriceId: stripePlanId, type: PlanStripePriceType.BASE_COST }]
  );
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
  create
);

export default router.routes();
