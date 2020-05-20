import Router from "koa-router";
import Knex from "knex";

import { addCredit, getCreditAmount, removeCredit } from "./dao";
import requireAuth = require("../../middleware/require-auth");
import requireAdmin = require("../../middleware/require-admin");
import db from "../../services/db";
import { hasProperties } from "@cala/ts-lib";

const router = new Router();

interface GetCreditQuery {
  userId?: string;
}

function* getCredits(this: AuthedContext): Iterator<any, any, any> {
  const { userId }: GetCreditQuery = this.query;

  if (!userId) {
    this.throw(400, "Missing user ID");
  }

  const creditAmountCents = yield getCreditAmount(userId);

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

function* changeCredit(this: AuthedContext): Iterator<any, any, any> {
  const { userId } = this.state;
  const { body } = this.request;

  if (!isChangeRequest(body)) {
    this.throw(400, "A credit amount, description, and user id is required.");
  }

  const deserializedAmount = Number(body.creditAmountCents);
  const deserializedExpiration = body.expiresAt
    ? new Date(body.expiresAt)
    : null;
  const currentAmountForUser = yield getCreditAmount(body.userId);
  const futureAmountForUser = deserializedAmount + currentAmountForUser;

  if (currentAmountForUser + deserializedAmount < 0) {
    this.throw(400, "A user cannot have negative credit.");
  }

  if (deserializedAmount > 0) {
    yield addCredit({
      amountCents: deserializedAmount,
      createdBy: userId,
      description: body.description,
      expiresAt: deserializedExpiration,
      givenTo: body.userId,
    });
    this.status = 200;
    this.body = { creditAmountCents: futureAmountForUser };
  } else if (deserializedAmount < 0) {
    yield db.transaction(async (trx: Knex.Transaction) => {
      await removeCredit(
        {
          amountCents: Math.abs(deserializedAmount),
          createdBy: userId,
          description: body.description,
          givenTo: body.userId,
        },
        trx
      );
    });
    this.status = 200;
    this.body = { creditAmountCents: futureAmountForUser };
  } else {
    this.status = 200;
    this.body = { creditAmountCents: currentAmountForUser };
  }
}

router.get("/", requireAuth, getCredits);
router.post("/", requireAdmin, changeCredit);

export default router.routes();
