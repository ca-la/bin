import Router from "koa-router";

import applyCode from "./apply-code";
import filterError = require("../../services/filter-error");
import InvalidDataError from "../../errors/invalid-data";
import requireAuth = require("../../middleware/require-auth");

const router = new Router();

function* redeemCode(this: AuthedContext): Iterator<any, any, any> {
  const { code } = this.params;

  const appliedAmountCents = yield applyCode(this.state.userId, code).catch(
    filterError(InvalidDataError, (err: Error) => this.throw(404, err.message))
  );

  this.body = { appliedAmountCents };
  this.status = 200;
}

router.post("/:code/redeem", requireAuth, redeemCode);

export default router.routes();
