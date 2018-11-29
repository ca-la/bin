import * as Koa from 'koa';

import filterError = require('../../services/filter-error');
import getDesignPermissionsDeprecated = require('../../services/deprecated-get-design-permissions');
import { getDesignPermissions } from '../../services/get-permissions';
import InvalidDataError = require('../../errors/invalid-data');
import * as ProductDesignsDAO from '../../dao/product-designs';

export function* attachDesignPermissions(this: Koa.Application.Context, designId: string): any {
  const { role, userId } = this.state;
  const design = yield ProductDesignsDAO.findById(designId).catch(
    filterError(InvalidDataError, (err: InvalidDataError) => this.throw(404, err))
  );
  this.assert(design, 404, 'Design not found');

  this.state.design = design;
  const deprecatedPermissions = yield getDesignPermissionsDeprecated(design, userId, role);
  const permissions = yield getDesignPermissions(design, role, userId);
  this.state.permissions = { ...deprecatedPermissions, ...permissions };
}

export function* canAccessDesignInParam(
  this: Koa.Application.Context,
  next: () => Promise<any>
): any {
  const { designId } = this.params;
  this.assert(designId, 400, 'Must provide design ID');
  yield attachDesignPermissions.call(this, designId);

  const { permissions } = this.state;
  this.assert(
    permissions && permissions.canView,
    403,
    "You don't have permission to view this design"
  );

  yield next;
}

export function* canAccessDesignInQuery(
  this: Koa.Application.Context,
  next: () => Promise<any>
): any {
  const { designId } = this.query;
  this.assert(designId, 400, 'Must provide design ID');
  yield attachDesignPermissions.call(this, designId);

  const { permissions } = this.state;
  this.assert(
    permissions && permissions.canView,
    403,
    "You don't have permission to view this design"
  );

  yield next;
}

export function* canCommentOnDesign(
  this: Koa.Application.Context,
  next: () => Promise<any>
): any {
  if (!this.state.permissions) {
    throw new Error('canCommentOnDesign must be chained from canAccessDesign');
  }
  this.assert(
    this.state.permissions.canComment,
    403,
    "You don't have permission to comment on this design"
  );
  yield next;
}

export function* canDeleteDesign(
  this: Koa.Application.Context,
  next: () => Promise<any>
): any {
  if (!this.state.permissions) {
    throw new Error('canDeleteDesign must be chained from canAccessDesign');
  }
  this.assert(
    this.state.permissions.canDelete,
    403,
    "You don't have permission to delete this design"
  );
  yield next;
}

export function* canEditDesign(
  this: Koa.Application.Context,
  next: () => Promise<any>
): any {
  if (!this.state.permissions) {
    throw new Error('canEditDesign must be chained from canAccessDesign');
  }
  this.assert(
    this.state.permissions.canEdit,
    403,
    "You don't have permission to edit this design"
  );
  yield next;
}

module.exports = {
  attachDesignPermissions,
  canAccessDesignInParam,
  canAccessDesignInQuery,
  canCommentOnDesign,
  canDeleteDesign,
  canEditDesign
};
