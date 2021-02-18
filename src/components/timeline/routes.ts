import Router from "koa-router";
import db from "../../services/db";

import requireAuth = require("../../middleware/require-auth");
import * as Service from "./service";
import * as CollectionsDAO from "../collections/dao";
import { getCollectionPermissions } from "../../services/get-permissions";

const router = new Router();

interface GetListQuery {
  collectionId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

function* getList(this: AuthedContext): Iterator<any, any, any> {
  const query: GetListQuery = this.query;

  if (!query.collectionId && !query.userId) {
    this.throw(400, "Missing collection or user id");
  }
  const { limit, offset } = this.query;

  if (query.collectionId) {
    const { role, userId } = this.state;
    const collection = yield CollectionsDAO.findById(query.collectionId);
    const permissions = yield getCollectionPermissions(
      db,
      collection,
      role,
      userId
    );
    this.assert(
      permissions && permissions.canView,
      403,
      "You don't have permission to view this collection"
    );

    this.status = 200;
    this.body = yield Service.findAllByCollectionId(query.collectionId);
  } else if (query.userId) {
    this.status = 200;
    this.body = yield Service.findAllByUserId(
      query.userId,
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined
    );
  }
}

router.get("/", requireAuth, getList);

export default router.routes();
