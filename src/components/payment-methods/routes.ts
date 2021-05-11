import Router from "koa-router";

import canAccessUserResource = require("../../middleware/can-access-user-resource");
import PaymentMethods from "./dao";
import requireAuth = require("../../middleware/require-auth");
import db from "../../services/db";
import createPaymentMethod from "./create-payment-method";
import convert from "koa-convert";
import { StrictContext } from "../../router-context";
import { PaymentMethod } from "./types";
import useTransaction, {
  TransactionState,
} from "../../middleware/use-transaction";

const router = new Router();

async function getPaymentMethods(
  ctx: StrictContext<PaymentMethod[]> & { query: { userId?: string } }
) {
  const { userId } = ctx.query;
  ctx.assert(userId, 400, "User ID must be provided");
  canAccessUserResource.call(ctx, userId);

  const methods = await PaymentMethods.findByUserId(db, userId);
  ctx.body = methods;
  ctx.status = 200;
}

interface AddBody {
  stripeCardToken: string;
}

function isAddBody(obj: any): obj is AddBody {
  return typeof obj.stripeCardToken === "string";
}

async function addPaymentMethod(
  ctx: StrictContext<PaymentMethod> & { state: {} & TransactionState }
) {
  const { body } = ctx.request;
  if (!isAddBody(body)) {
    ctx.throw(400, "Missing required information");
  }

  const { stripeCardToken } = body;
  const { userId } = ctx.state;

  const method = await createPaymentMethod({
    token: stripeCardToken,
    userId,
    teamId: null,
    trx: ctx.state.trx,
  });

  ctx.body = method;
  ctx.status = 201;
}

router.get("/", requireAuth, convert.back(getPaymentMethods));
router.post("/", requireAuth, useTransaction, convert.back(addPaymentMethod));

export default router.routes();
