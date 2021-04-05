import Router from "koa-router";
import convert from "koa-convert";
import { ParameterizedContext } from "koa";

import filterError = require("../../../services/filter-error");
import InvalidDataError from "../../../errors/invalid-data";
import db from "../../../services/db";
import {
  canAccessCollectionInParam,
  canDeleteCollection,
  canEditCollection,
  canMoveCollectionDesigns,
  canSubmitCollection,
  canCheckOutCollection,
} from "../../../middleware/can-access-collection";
import canAccessUserResource = require("../../../middleware/can-access-user-resource");
import requireAuth = require("../../../middleware/require-auth");
import requireAdmin = require("../../../middleware/require-admin");
import useTransaction, {
  TransactionState,
} from "../../../middleware/use-transaction";
import {
  SafeBodyState,
  typeGuardFromSchema,
} from "../../../middleware/type-guard";

import {
  checkCollectionsLimit,
  generateUpgradeBodyDueToCollectionsLimit,
  UpgradeTeamBody,
} from "../../teams";
import * as CollectionsDAO from "../dao";
import TeamUsersDAO from "../../team-users/dao";
import {
  Collection,
  CollectionDb,
  collectionUpdateSchema,
  CollectionUpdate,
} from "../types";
import { ROLES } from "../../users/types";
import { createSubmission, getSubmissionStatus } from "./submissions";
import {
  deleteDesign,
  deleteDesigns,
  getCollectionDesigns,
  putDesign,
  putDesigns,
} from "./designs";
import { getCollectionPermissions } from "../../../services/get-permissions";
import { commitCostInputs, recostInputs } from "./admin";
import {
  fetchExpiredWithLabels,
  fetchUncostedWithLabels,
} from "../services/fetch-with-labels";
import deleteCollectionAndRemoveDesigns from "../services/delete";
import { Role as TeamUserRole } from "../../team-users/types";
import {
  requireTeamRoles,
  canUserMoveCollectionBetweenTeams,
} from "../../team-users/service";
import { StrictContext } from "../../../router-context";

const router = new Router();

interface CreateCollectionRequest {
  createdAt: string;
  description: string;
  id: string;
  title: string;
  teamId: string;
}

function isCreateCollectionRequest(
  candidate: Record<string, any>
): candidate is CreateCollectionRequest {
  const keyset = new Set(Object.keys(candidate));

  return (
    ["createdAt", "description", "id", "title"].every(
      keyset.has.bind(keyset)
    ) && candidate.teamId
  );
}

function* createCollection(this: AuthedContext): Iterator<any, any, any> {
  const { body } = this.request;
  const { role, userId } = this.state;

  if (!isCreateCollectionRequest(body)) {
    this.throw(400, "Request does not match expected Collection type");
  }

  const data: CollectionDb = {
    deletedAt: null,
    createdBy: userId,
    teamId: body.teamId,
    createdAt: new Date(body.createdAt),
    description: body.description,
    id: body.id,
    title: body.title,
  };

  if (role !== "ADMIN") {
    const checkResult = yield checkCollectionsLimit(db, body.teamId);
    if (checkResult.isReached) {
      this.status = 402;
      this.body = yield generateUpgradeBodyDueToCollectionsLimit(
        db,
        body.teamId,
        checkResult.limit
      );
      return;
    }
  }

  const collection = yield CollectionsDAO.create(data).catch(
    filterError(InvalidDataError, (err: InvalidDataError) =>
      this.throw(400, err)
    )
  );

  const permissions = yield getCollectionPermissions(
    db,
    collection,
    role,
    userId
  );

  this.body = { ...collection, permissions };
  this.status = 201;
}

function* getList(this: AuthedContext): Iterator<any, any, any> {
  const {
    userId,
    teamId,
    isCosted,
    isSubmitted,
    isExpired,
    isDirectlyShared,
    limit,
    offset,
    search,
  } = this.query;
  const { role, userId: currentUserId } = this.state;
  const userIdToQuery =
    role === "ADMIN" ? userId : currentUserId === userId ? currentUserId : null;

  if (userIdToQuery) {
    const options = {
      userId: userIdToQuery,
      limit: Number(limit),
      offset: Number(offset),
      sessionRole: role,
      search,
    };

    const collections: Collection[] =
      isDirectlyShared === "true"
        ? yield CollectionsDAO.findDirectlySharedWithUser(db, options)
        : yield CollectionsDAO.findByUser(db, options);

    this.body = collections;
    this.status = 200;
  } else if (teamId !== undefined) {
    let teamUserRole = TeamUserRole.ADMIN;
    if (role !== "ADMIN") {
      const teamUser = yield TeamUsersDAO.findOne(db, {
        teamId,
        userId: currentUserId,
      });
      this.assert(teamUser, 403, "Only team users can list team collections");
      teamUserRole = teamUser.role;
    }
    const collections: Collection[] = yield CollectionsDAO.findByTeamWithPermissionsByRole(
      db,
      teamId,
      teamUserRole
    );

    this.body = collections;
    this.status = 200;
  } else if (
    role === "ADMIN" &&
    isCosted === "false" &&
    isSubmitted === "true"
  ) {
    this.body = yield fetchUncostedWithLabels();
    this.status = 200;
  } else if (role === "ADMIN" && isExpired === "true") {
    this.body = yield fetchExpiredWithLabels();
    this.status = 200;
  } else {
    this.throw(403, "Unable to match query");
  }
}

function* deleteCollection(this: AuthedContext): Iterator<any, any, any> {
  const { collectionId } = this.params;
  const targetCollection = yield CollectionsDAO.findById(collectionId);
  canAccessUserResource.call(this, targetCollection.createdBy);

  yield deleteCollectionAndRemoveDesigns(collectionId);
  this.status = 204;
}

function* getCollection(this: AuthedContext): Iterator<any, any, any> {
  const { collectionId } = this.params;
  const { role, userId } = this.state;

  if (collectionId) {
    const collection = yield CollectionsDAO.findById(collectionId);
    const permissions = yield getCollectionPermissions(
      db,
      collection,
      role,
      userId
    );
    this.body = { ...collection, permissions };
    this.status = 200;
  } else {
    this.throw(400, "CollectionId is required!");
  }
}

interface UpdateContext extends StrictContext<Collection | UpgradeTeamBody> {
  state: AuthedState & TransactionState & SafeBodyState<CollectionUpdate>;
  params: { collectionId: string };
}

async function updateCollection(ctx: UpdateContext) {
  const { collectionId } = ctx.params;
  const { role, trx, userId, safeBody: patch } = ctx.state;

  const isAdmin = role === ROLES.ADMIN;
  if (patch.teamId !== undefined && !isAdmin) {
    const canMove = await canUserMoveCollectionBetweenTeams({
      trx,
      collectionId,
      userId,
      teamIdToMoveTo: patch.teamId,
    });

    ctx.assert(
      canMove,
      403,
      "In order to move this collection to another team you have to be a member of both teams with at least the Editor role"
    );

    const checkResult = await checkCollectionsLimit(db, patch.teamId);
    if (checkResult.isReached) {
      ctx.status = 402;
      ctx.body = await generateUpgradeBodyDueToCollectionsLimit(
        db,
        patch.teamId,
        checkResult.limit
      );
      return;
    }
  }

  const collection = await CollectionsDAO.update(collectionId, patch).catch(
    filterError(InvalidDataError, (err: InvalidDataError) =>
      ctx.throw(400, err)
    )
  );
  const permissions = await getCollectionPermissions(
    trx,
    collection,
    role,
    userId
  );

  ctx.body = { ...collection, permissions };
  ctx.status = 200;
}

function* okResponse(this: ParameterizedContext): Iterator<any, any, any> {
  this.status = 204;
}

router.post(
  "/",
  requireAuth,
  requireTeamRoles(
    [TeamUserRole.OWNER, TeamUserRole.ADMIN, TeamUserRole.EDITOR],
    async (context: AuthedContext<{ teamId: string | null }>) =>
      context.request.body.teamId
  ),
  createCollection
);
router.get("/", requireAuth, getList);

router.del(
  "/:collectionId",
  requireAuth,
  canAccessCollectionInParam,
  canDeleteCollection,
  useTransaction,
  deleteCollection
);
router.get(
  "/:collectionId",
  requireAuth,
  canAccessCollectionInParam,
  getCollection
);
router.patch(
  "/:collectionId",
  requireAuth,
  canAccessCollectionInParam,
  canEditCollection,
  useTransaction,
  typeGuardFromSchema(collectionUpdateSchema),
  convert.back(updateCollection)
);

router.get(
  "/:collectionId/can-submit",
  requireAuth,
  useTransaction,
  canAccessCollectionInParam,
  canSubmitCollection,
  okResponse
);

router.get(
  "/:collectionId/can-check-out",
  requireAuth,
  useTransaction,
  canAccessCollectionInParam,
  canCheckOutCollection,
  okResponse
);

router.post(
  "/:collectionId/submissions",
  requireAuth,
  useTransaction,
  canAccessCollectionInParam,
  canSubmitCollection,
  createSubmission
);
router.get(
  "/:collectionId/submissions",
  requireAuth,
  canAccessCollectionInParam,
  getSubmissionStatus
);

// Moving Designs

router.get(
  "/:collectionId/designs",
  requireAuth,
  canAccessCollectionInParam,
  getCollectionDesigns
);
router.put(
  "/:collectionId/designs",
  requireAuth,
  canAccessCollectionInParam,
  canEditCollection,
  canMoveCollectionDesigns,
  putDesigns
);
router.del(
  "/:collectionId/designs",
  requireAuth,
  canAccessCollectionInParam,
  deleteDesigns
);
router.del(
  "/:collectionId/designs/:designId",
  requireAuth,
  canAccessCollectionInParam,
  canEditCollection,
  canMoveCollectionDesigns,
  deleteDesign
);
router.put(
  "/:collectionId/designs/:designId",
  requireAuth,
  canAccessCollectionInParam,
  canEditCollection,
  canMoveCollectionDesigns,
  putDesign
);

router.post(
  "/:collectionId/cost-inputs",
  requireAdmin,
  canAccessCollectionInParam,
  commitCostInputs
);
router.post(
  "/:collectionId/recost",
  requireAdmin,
  canAccessCollectionInParam,
  recostInputs
);
export default router.routes();
