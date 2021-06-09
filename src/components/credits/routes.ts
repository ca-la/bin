import Router from "koa-router";

import CreditsDAO from "./dao";
import requireAuth = require("../../middleware/require-auth");
import requireAdmin = require("../../middleware/require-admin");
import useTransaction from "../../middleware/use-transaction";
import { hasProperties } from "@cala/ts-lib";
import { CreditType } from "./types";

const router = new Router();

interface GetCreditQuery {
  userId?: string;
}

function* getCredits(this: AuthedContext): Iterator<any, any, any> {
  const { userId }: GetCreditQuery = this.query;

  if (!userId) {
    this.throw(400, "Missing user ID");
  }

  const creditAmountCents = yield CreditsDAO.getCreditAmount(userId);

  this.status = 200;
  this.body = { creditAmountCents };
}

interface ChangeRequest {
  creditAmountCents: number;
  description: string;
  expiresAt: Date | null;
  userId: string;
}

function isChangeRequest(data: any): data is ChangeRequest {
  return hasProperties(
    data,
    "creditAmountCents",
    "description",
    "expiresAt",
    "userId"
  );
}

function* changeCredit(
  this: TrxContext<AuthedContext>
): Iterator<any, any, any> {
  const { userId, trx } = this.state;
  const { body } = this.request;

  if (!isChangeRequest(body)) {
    this.throw(400, "A credit amount, description, and user id is required.");
  }

  const deserializedAmount = Number(body.creditAmountCents);
  const deserializedExpiration = body.expiresAt
    ? new Date(body.expiresAt)
    : null;
  const currentAmountForUser = yield CreditsDAO.getCreditAmount(body.userId);
  const futureAmountForUser = deserializedAmount + currentAmountForUser;

  if (currentAmountForUser + deserializedAmount < 0) {
    this.throw(400, "A user cannot have negative credit.");
  }

  yield CreditsDAO.create(trx, {
    creditDeltaCents: deserializedAmount,
    type: deserializedAmount > 0 ? CreditType.MANUAL : CreditType.REMOVE,
    createdBy: userId,
    description: body.description,
    expiresAt: deserializedExpiration,
    givenTo: body.userId,
    financingAccountId: null,
  });

  this.status = 200;
  this.body = { creditAmountCents: futureAmountForUser };
}

router.get("/", requireAuth, getCredits);
router.post("/", requireAdmin, useTransaction, changeCredit);

export default router.routes();
