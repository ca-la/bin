import Router from "koa-router";

import db from "../../services/db";
import requireAuth from "../../middleware/require-auth";
import useTransaction from "../../middleware/use-transaction";

import UserPageOnboardingsDAO from "./dao";
import { pageSchema } from "./types";
import { viewPage } from "./service";

const router = new Router();

function* getByUserId(this: AuthedContext<{}, {}, { userId: string }>) {
  const { userId } = this.params;

  if (userId !== this.state.userId && this.state.role !== "ADMIN") {
    this.throw(403, "Access to this resource is denied");
  }

  const userPageOnboardings = yield UserPageOnboardingsDAO.findByUser(
    db,
    userId
  );

  this.status = 200;
  this.body = userPageOnboardings;
}

function* addPageView(
  this: TrxContext<
    AuthedContext<Record<never, never>, {}, { userId: string; page: string }>
  >
) {
  const { trx } = this.state;
  const { userId, page: unvalidatedPage } = this.params;

  if (userId !== this.state.userId && this.state.role !== "ADMIN") {
    this.throw(403, "Access to this resource is denied");
  }

  const parsed = pageSchema.safeParse(unvalidatedPage);

  if (!parsed.success) {
    this.throw(400, "Not a valid PAGE type");
  }

  const { data: page } = parsed;

  const userPageOnboarding = yield viewPage(trx, userId, page);

  this.status = 200;
  this.body = userPageOnboarding;
}

router.get("/:userId", requireAuth, getByUserId);
router.put("/:userId/:page", requireAuth, useTransaction, addPageView);

export default router.routes();
