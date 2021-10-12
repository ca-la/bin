import Router from "koa-router";
import convert from "koa-convert";
import { ParameterizedContext } from "koa";
import { z } from "zod";

import filterError = require("../../../services/filter-error");
import InvalidDataError from "../../../errors/invalid-data";
import db from "../../../services/db";
import { parseContext } from "../../../services/parse-context";
import {
  booleanStringToBoolean,
  nullableNumberEmptyStringToNumber,
} from "../../../services/zod-helpers";
import {
  canAccessCollectionInParam,
  canDeleteCollection,
  canEditCollection,
  canMoveCollectionDesigns,
  canSubmitCollection,
  canCheckOutCollection,
} from "../../../middleware/can-access-collection";
import requireAuth from "../../../middleware/require-auth";
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
import { commitCostInputs, recostInputs, rejectCollection } from "./admin";
import {
  fetchExpiredWithLabels,
  fetchUncostedWithLabels,
  CollectionWithLabels,
} from "../services/fetch-with-labels";
import deleteCollectionAndRemoveDesigns from "../services/delete";
import { Role as TeamUserRole } from "../../team-users/types";
import {
  requireTeamRoles,
  canUserMoveCollectionBetweenTeams,
  RequireTeamRolesContext,
} from "../../team-users/service";
import { StrictContext } from "../../../router-context";

const router = new Router();

const createCollectionRequestSchema = z.object({
  createdAt: z.string(),
  description: z.string().nullable(),
  id: z.string(),
  title: z.string(),
  teamId: z.string(),
});
type CreateCollectionRequest = z.infer<typeof createCollectionRequestSchema>;

interface CreateContext extends StrictContext<Collection | UpgradeTeamBody> {
  state: AuthedState & SafeBodyState<CreateCollectionRequest>;
}

const createCollection = convert.back(async (ctx: CreateContext) => {
  const { role, userId, safeBody } = ctx.state;

  const data: CollectionDb = {
    deletedAt: null,
    createdBy: userId,
    teamId: safeBody.teamId,
    createdAt: new Date(safeBody.createdAt),
    description: safeBody.description,
    id: safeBody.id,
    title: safeBody.title,
  };

  if (role !== "ADMIN") {
    const checkResult = await checkCollectionsLimit(db, safeBody.teamId);
    if (checkResult.isReached) {
      ctx.status = 402;
      ctx.body = await generateUpgradeBodyDueToCollectionsLimit(
        db,
        safeBody.teamId,
        checkResult.limit
      );
      return;
    }
  }

  const collectionDb: CollectionDb = await CollectionsDAO.create(data).catch(
    filterError(InvalidDataError, (err: InvalidDataError) =>
      ctx.throw(400, err)
    )
  );

  const permissions = await getCollectionPermissions(
    db,
    collectionDb,
    role,
    userId
  );

  const collection = {
    ...collectionDb,
    designs: CollectionsDAO.convertCollectionDesignsDbMetaToDesignMeta(
      collectionDb.designs
    ),
    permissions,
  };

  ctx.body = collection;
  ctx.status = 201;
});

const getListContextSchema = z.object({
  query: z
    .object({
      userId: z.string(),
      teamId: z.string(),
      isCosted: booleanStringToBoolean,
      isSubmitted: booleanStringToBoolean,
      isExpired: booleanStringToBoolean,
      isDirectlyShared: booleanStringToBoolean,
      limit: nullableNumberEmptyStringToNumber,
      offset: nullableNumberEmptyStringToNumber,
      search: z.string(),
    })
    .partial(),
  state: z.object({
    userId: z.string(),
    role: z.string(),
  }),
});

interface GetListContext
  extends StrictContext<(Collection | CollectionWithLabels)[]> {
  state: AuthedState;
}

async function getList(ctx: GetListContext) {
  const {
    query: {
      userId,
      teamId,
      isCosted,
      isSubmitted,
      isExpired,
      isDirectlyShared,
      limit,
      offset,
      search,
    },
    state: { userId: currentUserId, role },
  } = parseContext(ctx, getListContextSchema);

  const userIdToQuery =
    role === "ADMIN" ? userId : currentUserId === userId ? currentUserId : null;

  if (userIdToQuery) {
    const options = {
      userId: userIdToQuery,
      limit,
      offset,
      sessionRole: role,
      search,
    };

    const collections: Collection[] = isDirectlyShared
      ? await CollectionsDAO.findDirectlySharedWithUser(db, options)
      : await CollectionsDAO.findByUser(db, options);

    ctx.body = collections;
    ctx.status = 200;
  } else if (teamId !== undefined) {
    let teamUserRole = TeamUserRole.ADMIN;
    if (role !== "ADMIN") {
      const teamUser = await TeamUsersDAO.findOne(db, {
        teamId,
        userId: currentUserId,
      });
      ctx.assert(teamUser, 403, "Only team users can list team collections");
      teamUserRole = teamUser.role;
    }
    const collections: Collection[] = await CollectionsDAO.findByTeamWithPermissionsByRole(
      db,
      teamId,
      teamUserRole
    );

    ctx.body = collections;
    ctx.status = 200;
  } else if (role === "ADMIN" && !isCosted && isSubmitted) {
    ctx.body = await fetchUncostedWithLabels();
    ctx.status = 200;
  } else if (role === "ADMIN" && isExpired) {
    ctx.body = await fetchExpiredWithLabels();
    ctx.status = 200;
  } else {
    ctx.throw(403, "Unable to match query");
  }
}

interface DeleteContext extends StrictContext {
  state: AuthedState;
  params: { collectionId: string };
}

async function deleteCollection(ctx: DeleteContext) {
  const { collectionId } = ctx.params;

  await deleteCollectionAndRemoveDesigns(collectionId);
  ctx.status = 204;
}

interface GetContext extends StrictContext<Collection> {
  state: AuthedState;
  params: { collectionId: string };
}

async function getCollection(ctx: GetContext) {
  const { collectionId } = ctx.params;
  const { role, userId } = ctx.state;

  const collectionDb = await CollectionsDAO.findById(collectionId);
  ctx.assert(
    collectionDb,
    404,
    `Collection with id ${ctx.params.collectionId} not found`
  );

  const permissions = await getCollectionPermissions(
    db,
    collectionDb,
    role,
    userId
  );
  const collection = {
    ...collectionDb,
    designs: CollectionsDAO.convertCollectionDesignsDbMetaToDesignMeta(
      collectionDb.designs
    ),
    permissions,
  };

  ctx.body = collection;
  ctx.status = 200;
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

    ctx.assert(canMove, 403, "Invalid team permissions");

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

  const collectionDb: CollectionDb = await CollectionsDAO.update(
    collectionId,
    patch
  ).catch(
    filterError(InvalidDataError, (err: InvalidDataError) =>
      ctx.throw(400, err)
    )
  );
  const permissions = await getCollectionPermissions(
    trx,
    collectionDb,
    role,
    userId
  );

  const collection: Collection = {
    ...collectionDb,
    designs: CollectionsDAO.convertCollectionDesignsDbMetaToDesignMeta(
      collectionDb.designs
    ),
    permissions,
  };

  ctx.body = collection;
  ctx.status = 200;
}

function* okResponse(this: ParameterizedContext): Iterator<any, any, any> {
  this.status = 204;
}

interface CreateCollectionRequireTeamRolesContext
  extends RequireTeamRolesContext {
  state: RequireTeamRolesContext["state"] &
    SafeBodyState<CreateCollectionRequest>;
}

router.post(
  "/",
  requireAuth,
  typeGuardFromSchema<CreateCollectionRequest>(createCollectionRequestSchema),
  requireTeamRoles(
    [
      TeamUserRole.OWNER,
      TeamUserRole.ADMIN,
      TeamUserRole.EDITOR,
      TeamUserRole.TEAM_PARTNER,
    ],
    async (context: CreateCollectionRequireTeamRolesContext) =>
      context.state.safeBody.teamId
  ),
  createCollection
);
router.get("/", requireAuth, convert.back(getList));

router.del(
  "/:collectionId",
  requireAuth,
  canAccessCollectionInParam,
  canDeleteCollection,
  convert.back(deleteCollection)
);
router.get(
  "/:collectionId",
  requireAuth,
  canAccessCollectionInParam,
  convert.back(getCollection)
);
router.patch(
  "/:collectionId",
  requireAuth,
  canAccessCollectionInParam,
  canEditCollection,
  typeGuardFromSchema(collectionUpdateSchema),
  useTransaction,
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
  canEditCollection,
  canMoveCollectionDesigns,
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
router.post(
  "/:collectionId/reject",
  requireAdmin,
  convert.back(rejectCollection)
);
export default router.routes();
