import Router from "koa-router";

import * as PlansDAO from "./dao";
import requireAdmin = require("../../middleware/require-admin");
import useTransaction from "../../middleware/use-transaction";
import { Plan } from "./plan";
import { isCreatePlanInputRequest } from "./domain-object";
import { typeGuard } from "../../middleware/type-guard";

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
    monthlyCostCents,
    revenueShareBasisPoints,
    costOfGoodsShareBasisPoints,
    stripePlanId,
    title,
    isDefault,
    description,
  } = this.request.body;

  const { trx } = this.state;

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
  });
  this.status = 201;
  this.body = createdPlan;
}

router.get("/", useTransaction, getPlans);
router.get("/:planId", useTransaction, getById);
router.post(
  "/",
  requireAdmin,
  typeGuard(isCreatePlanInputRequest),
  useTransaction,
  createPlan
);

export default router.routes();
