import Koa from "koa";
import Knex from "knex";

import CollectionsDAO = require("../../components/collections/dao");
import * as TeamsService from "../../components/teams/service";
import {
  canSubmitTeamCollection,
  canCheckOutTeamCollection,
} from "../../components/plans/find-collection-team-plans";
import { getCollectionPermissions } from "../../services/get-permissions";
import requireUserSubscription from "../../middleware/require-user-subscription";
import db from "../../services/db";

export function* attachCollectionAndPermissions(
  this: Koa.Context,
  collectionId: string
): any {
  const { role, userId } = this.state;

  const collection = yield CollectionsDAO.findById(collectionId);
  this.assert(collection, 404, "Collection not found");
  const permissions = yield db.transaction((trx: Knex.Transaction) =>
    getCollectionPermissions(trx, collection, role, userId)
  );

  this.state.collection = collection;
  this.state.permissions = permissions;
}

export function* canAccessCollectionInParam(
  this: Koa.Context,
  next: () => any
): Iterator<any, any, any> {
  const { collectionId } = this.params;
  yield attachCollectionAndPermissions.call(this, collectionId);

  const { permissions } = this.state;
  this.assert(
    permissions && permissions.canView,
    403,
    "You don't have permission to view this collection"
  );

  yield next;
}

export function* canAccessCollectionInRequestBody(
  this: AuthedContext<{ collectionId: string }, PermissionsKoaState>,
  next: () => any
): Iterator<any, any, any> {
  const { collectionId } = this.request.body;
  yield attachCollectionAndPermissions.call(this, collectionId);

  const { permissions } = this.state;
  this.assert(
    permissions && permissions.canView,
    403,
    "You don't have permission to view this collection"
  );

  yield next;
}

export function* canDeleteCollection(
  this: AuthedContext<{}, PermissionsKoaState>,
  next: () => any
): any {
  const { permissions } = this.state;
  if (!permissions) {
    throw new Error(
      "canDeleteCollection must be chained with canAccessCollectionInParam"
    );
  }

  this.assert(
    permissions.canDelete,
    403,
    "You don't have permission to delete this collection"
  );

  yield next;
}

export const canMoveCollectionDesigns = canDeleteCollection;

export function* canEditCollection(
  this: AuthedContext<{}, PermissionsKoaState>,
  next: () => any
): Iterator<any> {
  const { permissions } = this.state;
  if (!permissions) {
    throw new Error(
      "canEditCollection must be chained with canAccessCollectionInParam"
    );
  }

  this.assert(
    permissions.canEdit,
    403,
    "You don't have permission to edit this collection"
  );

  yield next;
}

export function* canSubmitCollection(
  this: TrxContext<
    AuthedContext<{}, PermissionsKoaState & CollectionsKoaState>
  >,
  next: () => any
): any {
  const { permissions, collection, trx, role } = this.state;

  if (role === "ADMIN") {
    return yield next;
  }

  if (!permissions || !collection) {
    throw new Error(
      "canSubmitCollection must be chained with a canAccessCollection* call"
    );
  }

  if (!trx) {
    throw new Error(
      "canSubmitCollection must be chained with a useTransaction call"
    );
  }

  this.assert(
    permissions.canSubmit,
    403,
    "You don't have permission to submit this collection"
  );

  if (collection.teamId) {
    const canSubmit = yield canSubmitTeamCollection(trx, collection.id);
    if (!canSubmit) {
      this.status = 402;
      this.body = yield TeamsService.generateUpgradeBodyDueToSubmitAttempt(
        trx,
        collection.teamId
      );
      return;
    }
  } else {
    yield requireUserSubscription.call(this, next);
  }

  yield next;
}

export function* canCheckOutCollection(
  this: TrxContext<
    AuthedContext<{}, PermissionsKoaState & CollectionsKoaState>
  >,
  next: () => any
): any {
  const { permissions, collection, trx, role } = this.state;

  if (role === "ADMIN") {
    return yield next;
  }

  if (!permissions || !collection) {
    throw new Error(
      "canCheckOutCollection must be chained with a canAccessCollection* call"
    );
  }

  if (!trx) {
    throw new Error(
      "canCheckOutCollection must be chained with a useTransaction call"
    );
  }

  this.assert(
    permissions.canSubmit,
    403,
    "You don't have permission to check out this collection"
  );

  if (collection.teamId) {
    const canCheckOut = yield canCheckOutTeamCollection(trx, collection.id);
    if (!canCheckOut) {
      this.status = 402;
      this.body = yield TeamsService.generateUpgradeBodyDueToCheckoutAttempt(
        trx,
        collection.teamId
      );
      return;
    }
  } else {
    yield requireUserSubscription.call(this, next);
  }

  yield next;
}
