import * as Koa from 'koa';

import { getDesignPermissions } from '../../services/get-permissions';
import { findDesignByTaskId } from '../../dao/product-designs/dao';

/**
 * Determines whether or not the current user has access to the supplied task.
 */
export function* canAccessTaskInParams(
  this: Koa.Application.Context,
  next: () => Promise<any>
): any {
  const { role, userId } = this.state;
  const { taskId } = this.params;

  if (!taskId) {
    return this.throw(400, 'Must provide a taskId in the query parameters.');
  }
  const design = yield findDesignByTaskId(taskId);
  if (!design) {
    return this.throw(404, 'Design cannot be found.');
  }
  this.state.permissions = yield getDesignPermissions(design, role, userId);
  const { permissions } = this.state;

  this.assert(
    permissions && permissions.canView,
    403,
    'You don\'t have permission to view the task on this design.'
  );

  yield next;
}