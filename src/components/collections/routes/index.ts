import Router from "koa-router";

import filterError = require("../../../services/filter-error");
import InvalidDataError from "../../../errors/invalid-data";
import db from "../../../services/db";
import {
  canAccessCollectionInParam,
  canDeleteCollection,
  canEditCollection,
  canMoveCollectionDesigns,
  canSubmitCollection,
} from "../../../middleware/can-access-collection";
import canAccessUserResource = require("../../../middleware/can-access-user-resource");
import requireAuth = require("../../../middleware/require-auth");
import requireAdmin = require("../../../middleware/require-admin");
import useTransaction from "../../../middleware/use-transaction";

import * as CollectionsDAO from "../dao";
import * as CollaboratorsDAO from "../../collaborators/dao";
import TeamUsersDAO from "../../team-users/dao";
import { isPartialCollection } from "../domain-object";
import { Collection, CollectionDb } from "../types";
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
import { requireTeamRoles } from "../../team-users/service";

const router = new Router();

interface CreateCollectionRequest {
  createdAt: string;
  description: string;
  id: string;
  title: string;
  teamId?: string | null;
}

function isCreateCollectionRequest(
  candidate: Record<string, any>
): candidate is CreateCollectionRequest {
  const keyset = new Set(Object.keys(candidate));

  return ["createdAt", "description", "id", "title"].every(
    keyset.has.bind(keyset)
  );
}

function* createCollection(
  this: TrxContext<AuthedContext>
): Iterator<any, any, any> {
  const { body } = this.request;
  const { role, trx, userId } = this.state;

  if (!isCreateCollectionRequest(body)) {
    this.throw(400, "Request does not match expected Collection type");
  }

  const data: CollectionDb = {
    deletedAt: null,
    createdBy: userId,
    teamId: body.teamId || null,
    createdAt: new Date(body.createdAt),
    description: body.description,
    id: body.id,
    title: body.title,
  };

  const collection = yield CollectionsDAO.create(data).catch(
    filterError(InvalidDataError, (err: InvalidDataError) =>
      this.throw(400, err)
    )
  );

  if (!body.teamId) {
    yield CollaboratorsDAO.create(
      {
        cancelledAt: null,
        collectionId: collection.id,
        designId: null,
        invitationMessage: "",
        role: "EDIT",
        userEmail: null,
        userId,
        teamId: null,
      },
      trx
    );
  }
  const permissions = yield getCollectionPermissions(
    trx,
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

function* updateCollection(
  this: TrxContext<AuthedContext>
): Iterator<any, any, any> {
  const { collectionId } = this.params;
  const { body } = this.request;
  const { role, trx, userId } = this.state;

  if (body && isPartialCollection(body)) {
    const collection = yield CollectionsDAO.update(collectionId, body).catch(
      filterError(InvalidDataError, (err: InvalidDataError) =>
        this.throw(400, err)
      )
    );
    const permissions = yield getCollectionPermissions(
      trx,
      collection,
      role,
      userId
    );

    this.body = { ...collection, permissions };
    this.status = 200;
  } else {
    this.throw(400, "Request to update does not match Collection");
  }
}

router.post(
  "/",
  requireAuth,
  useTransaction,
  requireTeamRoles(
    [TeamUserRole.OWNER, TeamUserRole.ADMIN, TeamUserRole.EDITOR],
    async (context: AuthedContext<{ teamId: string | null }>) =>
      context.request.body.teamId || null,
    { allowNoTeam: true }
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
  updateCollection
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
