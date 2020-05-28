import Koa from "koa";
import compose from "koa-compose";

import {
  getDesignPermissions,
  Permissions,
} from "../../services/get-permissions";
import ResourceNotFoundError from "../../errors/resource-not-found";
import filterError = require("../../services/filter-error");
import { requireQueryParam } from "../require-query-param";

export function* attachDesignPermissions(
  this: Koa.Context,
  designId: string
): any {
  const { role, userId } = this.state;
  this.state.permissions = yield getDesignPermissions({
    designId,
    sessionRole: role,
    sessionUserId: userId,
  }).catch(
    filterError(ResourceNotFoundError, () => {
      this.throw(404, "Design not found");
    })
  );
}

export function* attachAggregateDesignPermissions(
  this: Koa.Context,
  designIds: string[]
): any {
  const { role, userId } = this.state;

  let aggregatePermissions: Permissions = {
    canComment: true,
    canDelete: true,
    canEdit: true,
    canEditVariants: true,
    canSubmit: true,
    canView: true,
  };

  for (const designId of designIds) {
    const permissions = yield getDesignPermissions({
      designId,
      sessionRole: role,
      sessionUserId: userId,
    });

    aggregatePermissions = {
      canComment: aggregatePermissions.canComment && permissions.canComment,
      canDelete: aggregatePermissions.canDelete && permissions.canDelete,
      canEdit: aggregatePermissions.canEdit && permissions.canEdit,
      canEditVariants:
        aggregatePermissions.canEditVariants && permissions.canEditVariants,
      canSubmit: aggregatePermissions.canSubmit && permissions.canSubmit,
      canView: aggregatePermissions.canView && permissions.canView,
    };
  }

  this.state.permissions = aggregatePermissions;
}

export function requireDesignIdBy<ContextBodyType, StateType = {}>(
  designIdFetcher: (
    this: AuthedContext<ContextBodyType, StateType>
  ) => Promise<string>
): any {
  return function* (
    this: AuthedContext<ContextBodyType, StateType & { designId: string }>,
    next: () => Promise<any>
  ): Generator<unknown, void, string> {
    const designId: string = yield designIdFetcher.call(this).catch(() => {
      this.throw(404, `Cannot find design with ID: ${designId}`);
    });
    this.state.designId = designId;

    yield next;
  };
}

export function* canAccessDesignsInQuery(
  this: Koa.Context,
  next: () => Promise<any>
): any {
  const { designIds } = this.query;
  if (!designIds) {
    this.throw(400, "Must provide designIds in query parameters");
  }

  yield attachAggregateDesignPermissions.call(this, designIds.split(","));

  const { permissions } = this.state;
  this.assert(
    permissions && permissions.canView,
    403,
    "You don't have permission to view this design"
  );

  yield next;
}

export function* canAccessDesignInState(
  this: Koa.Context,
  next: () => Promise<any>
): any {
  yield attachDesignPermissions.call(this, this.state.designId);

  const { permissions } = this.state;
  this.assert(
    permissions && permissions.canView,
    403,
    "You don't have permission to view this design"
  );

  yield next;
}

export const canAccessDesignInParam = compose([
  requireDesignIdBy(function (this: Koa.Context): Promise<string> {
    return Promise.resolve(this.params.designId);
  }),
  canAccessDesignInState,
]);

export const canAccessDesignInQuery = compose([
  requireQueryParam<{ designId: string }>("designId"),
  requireDesignIdBy(function (this: Koa.Context): Promise<string> {
    return Promise.resolve(this.query.designId);
  }),
  canAccessDesignInState,
]);

export function* canCommentOnDesign(
  this: Koa.Context,
  next: () => Promise<any>
): any {
  if (!this.state.permissions) {
    throw new Error("canCommentOnDesign must be chained from canAccessDesign");
  }
  this.assert(
    this.state.permissions.canComment,
    403,
    "You don't have permission to comment on this design"
  );
  yield next;
}

export function* canDeleteDesign(
  this: Koa.Context,
  next: () => Promise<any>
): any {
  if (!this.state.permissions) {
    throw new Error("canDeleteDesign must be chained from canAccessDesign");
  }
  this.assert(
    this.state.permissions.canDelete,
    403,
    "You don't have permission to delete this design"
  );
  yield next;
}

export function* canDeleteDesigns(
  this: Koa.Context,
  next: () => Promise<any>
): any {
  if (!this.state.permissions) {
    throw new Error("canDeleteDesigns must be chained from canAccessDesigns");
  }
  this.assert(
    this.state.permissions.canDelete,
    403,
    "You don't have permission to delete these designs"
  );
  yield next;
}

export function* canEditDesign(
  this: Koa.Context,
  next: () => Promise<any>
): any {
  if (!this.state.permissions) {
    throw new Error("canEditDesign must be chained from canAccessDesign");
  }
  this.assert(
    this.state.permissions.canEdit,
    403,
    "You don't have permission to edit this design"
  );
  yield next;
}
