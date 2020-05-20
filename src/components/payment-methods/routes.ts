import Router from "koa-router";
import Knex from "knex";

import canAccessUserResource = require("../../middleware/can-access-user-resource");
import PaymentMethods = require("./dao");
import requireAuth = require("../../middleware/require-auth");
import db from "../../services/db";
import createPaymentMethod from "./create-payment-method";

const router = new Router();

function* getPaymentMethods(this: AuthedContext): Iterator<any, any, any> {
  const { userId } = this.query;
  this.assert(userId, 400, "User ID must be provided");
  canAccessUserResource.call(this, userId);

  const methods = yield PaymentMethods.findByUserId(userId);
  this.body = methods;
  this.status = 200;
}

interface AddBody {
  stripeCardToken: string;
}

function isAddBody(obj: any): obj is AddBody {
  return typeof obj.stripeCardToken === "string";
}

function* addPaymentMethod(this: AuthedContext): Iterator<any, any, any> {
  const { body } = this.request;
  if (!isAddBody(body)) {
    this.throw(400, "Missing required information");
  }

  const { stripeCardToken } = body;
  const { userId } = this.state;

  yield db.transaction(async (trx: Knex.Transaction) => {
    const method = await createPaymentMethod({
      token: stripeCardToken,
      userId,
      trx,
    });

    this.body = method;
    this.status = 201;
  });
}

router.get("/", requireAuth, getPaymentMethods);
router.post("/", requireAuth, addPaymentMethod);

export default router.routes();
