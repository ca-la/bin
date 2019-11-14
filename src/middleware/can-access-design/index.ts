import Koa from 'koa';

import filterError = require('../../services/filter-error');
import {
  getDesignPermissions,
  Permissions
} from '../../services/get-permissions';
import InvalidDataError = require('../../errors/invalid-data');
import ProductDesignsDAO from '../../components/product-designs/dao';

export function* attachDesignPermissions(
  this: Koa.Application.Context,
  designId: string
): any {
  const { role, userId } = this.state;
  const design = yield ProductDesignsDAO.findById(designId).catch(
    filterError(InvalidDataError, (err: InvalidDataError) =>
      this.throw(404, err)
    )
  );
  this.assert(design, 404, 'Design not found');

  this.state.design = design;
  this.state.permissions = yield getDesignPermissions(design, role, userId);
}

export function* attachAggregateDesignPermissions(
  this: Koa.Application.Context,
  designIds: string[]
): any {
  const { role, userId } = this.state;
  const designs = yield ProductDesignsDAO.findByIds(designIds).catch(
    filterError(InvalidDataError, (err: InvalidDataError) => {
      return this.throw(404, err);
    })
  );

  let aggregatePermissions: Permissions = {
    canComment: true,
    canDelete: true,
    canEdit: true,
    canEditVariants: true,
    canSubmit: true,
    canView: true
  };

  for (const design of designs) {
    const permissions = yield getDesignPermissions(design, role, userId);

    aggregatePermissions = {
      canComment: aggregatePermissions.canComment && permissions.canComment,
      canDelete: aggregatePermissions.canDelete && permissions.canDelete,
      canEdit: aggregatePermissions.canEdit && permissions.canEdit,
      canEditVariants:
        aggregatePermissions.canEditVariants && permissions.canEditVariants,
      canSubmit: aggregatePermissions.canSubmit && permissions.canSubmit,
      canView: aggregatePermissions.canView && permissions.canView
    };
  }

  this.state.permissions = aggregatePermissions;
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

export function* canAccessDesignsInQuery(
  this: Koa.Application.Context,
  next: () => Promise<any>
): any {
  const { designIds } = this.query;
  if (!designIds) {
    return this.throw(400, 'Must provide designIds in query parameters');
  }

  yield attachAggregateDesignPermissions.call(this, designIds.split(','));

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

  if (!designId) {
    return this.throw(400, 'Must provide a designId in query parameters');
  }

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

export function* canDeleteDesigns(
  this: Koa.Application.Context,
  next: () => Promise<any>
): any {
  if (!this.state.permissions) {
    throw new Error('canDeleteDesigns must be chained from canAccessDesigns');
  }
  this.assert(
    this.state.permissions.canDelete,
    403,
    "You don't have permission to delete these designs"
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
