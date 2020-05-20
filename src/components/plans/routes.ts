import Router from "koa-router";

import * as PlansDAO from "./dao";

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

router.get("/", getPlans);
router.get("/:planId", getById);

export default router.routes();
