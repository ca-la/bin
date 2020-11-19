import Router from "koa-router";
import uuid from "node-uuid";
import { hasProperties } from "@cala/ts-lib";

import NonBidTeamCostsDAO from "./dao";
import filterError from "../../services/filter-error";
import requireAdmin = require("../../middleware/require-admin");
import requireAuth = require("../../middleware/require-auth");
import ResourceNotFoundError from "../../errors/resource-not-found";
import useTransaction from "../../middleware/use-transaction";
import { NonBidTeamCost } from "./types";

const router = new Router();

function isCreateBody(
  candidate: object | undefined
): candidate is Unsaved<NonBidTeamCost> {
  return candidate
    ? hasProperties(candidate, "teamId", "cents", "note", "category")
    : false;
}

function* createCost(
  this: TrxContext<AuthedContext<Unsaved<NonBidTeamCost>>>
): Iterator<any, any, any> {
  if (!isCreateBody(this.request.body)) {
    this.throw(400, "Request does not match NonBidTeamCost");
  }

  const { teamId, cents, note, category } = this.request.body;

  const { trx, userId } = this.state;

  const now = new Date();

  const created = yield NonBidTeamCostsDAO.create(trx, {
    id: uuid.v4(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdBy: userId,
    teamId,
    cents,
    note,
    category,
  });

  this.body = created;
  this.status = 201;
}

interface GetListQuery {
  teamId?: string;
}

function* listCosts(this: TrxContext<AuthedContext>): Iterator<any, any, any> {
  const { teamId }: GetListQuery = this.query;
  const { trx } = this.state;

  if (!teamId) {
    this.throw(400, "You must specifiy a team ID");
  }

  const byTeam = yield NonBidTeamCostsDAO.find(trx, { teamId });

  this.body = byTeam;
  this.status = 200;
}

function* deleteCost(this: TrxContext<AuthedContext>): Iterator<any, any, any> {
  const { costId } = this.params;
  const { trx } = this.state;

  yield NonBidTeamCostsDAO.deleteById(trx, costId).catch(
    filterError(ResourceNotFoundError, () => {
      this.throw(404, "Non-bid team cost not found");
    })
  );

  this.status = 204;
}

router.post("/", requireAuth, requireAdmin, useTransaction, createCost);
router.get("/", requireAuth, requireAdmin, useTransaction, listCosts);
router.del("/:costId", requireAuth, requireAdmin, useTransaction, deleteCost);

export default router.routes();
