import Knex from "knex";
import convert from "koa-convert";

import CollectionsDAO = require("../../components/collections/dao");
import { CollectionDb } from "../../components/collections/types";
import * as TeamsService from "../../components/teams/service";
import {
  canSubmitTeamCollection,
  canCheckOutTeamCollection,
} from "../../components/plans/find-collection-team-plans";
import {
  getCollectionPermissions,
  Permissions,
} from "../../services/get-permissions";
import requireUserSubscription from "../../middleware/require-user-subscription";
import { SafeBodyState } from "../../middleware/type-guard";
import db from "../../services/db";
import { StrictContext, UnknownRequest } from "../../router-context";

interface CollectionAndPermissionsState {
  collection: CollectionDb;
  permissions: Permissions;
}
interface AttachCollectionAndPermissionsContext extends StrictContext {
  state: AuthedState & CollectionAndPermissionsState;
}

export const attachCollectionAndPermissions = async (
  ctx: AttachCollectionAndPermissionsContext,
  collectionId: string
) => {
  const { role, userId } = ctx.state;

  const collection = await CollectionsDAO.findById(collectionId);
  if (collection === null) {
    ctx.throw(404, "Collection not found");
  }
  const permissions = await db.transaction((trx: Knex.Transaction) =>
    getCollectionPermissions(trx, collection, role, userId)
  );

  ctx.state.collection = collection;
  ctx.state.permissions = permissions;
};

interface CanAccessCollectionInParamContext extends StrictContext {
  state: AuthedState & CollectionAndPermissionsState;
  params: {
    collectionId: string;
  };
}

export const canAccessCollectionInParam = convert.back(
  async (ctx: CanAccessCollectionInParamContext, next: () => Promise<any>) => {
    const { collectionId } = ctx.params;
    await attachCollectionAndPermissions(ctx, collectionId);

    const { permissions } = ctx.state;
    ctx.assert(
      permissions && permissions.canView,
      403,
      "You don't have permission to view this collection"
    );

    await next();
  }
);

interface CanAccessCollectionInRequestBodyContext extends StrictContext {
  state: AuthedState & PermittedState & CollectionAndPermissionsState;
  request: { body: { collectionId: string } } & UnknownRequest;
}

export const canAccessCollectionInRequestBody = convert.back(
  async (
    ctx: CanAccessCollectionInRequestBodyContext,
    next: () => Promise<any>
  ) => {
    const { collectionId } = ctx.request.body;
    await attachCollectionAndPermissions(ctx, collectionId);

    const { permissions } = ctx.state;
    ctx.assert(
      permissions && permissions.canView,
      403,
      "You don't have permission to view this collection"
    );

    await next();
  }
);

interface CanAccessCollectionInSafeBodyRequestContext<BodyType>
  extends StrictContext {
  state: AuthedState &
    SafeBodyState<BodyType> &
    PermittedState &
    CollectionAndPermissionsState;
}

export const canAccessCollectionInSafeBodyRequest = convert.back(
  async <BodyType extends { collectionId: string }>(
    ctx: CanAccessCollectionInSafeBodyRequestContext<BodyType>,
    next: () => Promise<any>
  ) => {
    const { collectionId } = ctx.state.safeBody;
    await attachCollectionAndPermissions(ctx, collectionId);

    const { permissions } = ctx.state;
    ctx.assert(
      permissions && permissions.canView,
      403,
      "You don't have permission to view this collection"
    );

    await next();
  }
);

interface CanDeleteCollectionContext extends StrictContext {
  state: AuthedState & PermittedState;
}

export const canDeleteCollection = convert.back(
  async (ctx: CanDeleteCollectionContext, next: () => Promise<any>) => {
    const { permissions } = ctx.state;
    if (!permissions) {
      throw new Error(
        "canDeleteCollection must be chained with canAccessCollectionInParam"
      );
    }

    ctx.assert(
      permissions.canDelete,
      403,
      "You don't have permission to delete this collection"
    );

    await next();
  }
);

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
