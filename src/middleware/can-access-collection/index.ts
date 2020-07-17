import Koa from "koa";

import CollectionsDAO = require("../../components/collections/dao");
import { getCollectionPermissions } from "../../services/get-permissions";

export function* attachCollectionAndPermissions(
  this: Koa.Context,
  collectionId: string
): any {
  const { role, userId } = this.state;

  const collection = yield CollectionsDAO.findById(collectionId);
  this.assert(collection, 404, "Collection not found");
  const permissions = yield getCollectionPermissions(collection, role, userId);

  this.state.collection = collection;
  this.state.permissions = permissions;
}

export function* canAccessCollectionInParam(
  this: Koa.Context,
  next: () => Promise<any>
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
  next: () => Promise<any>
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
  next: () => Promise<any>
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
  next: () => Promise<any>
): any {
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
  this: AuthedContext<{}, PermissionsKoaState>,
  next: () => Promise<any>
): any {
  const { permissions } = this.state;
  if (!permissions) {
    throw new Error(
      "canSubmitCollection must be chained with canAccessCollectionInParam"
    );
  }

  this.assert(
    permissions.canSubmit,
    403,
    "You don't have permission to submit this collection"
  );

  yield next;
}
