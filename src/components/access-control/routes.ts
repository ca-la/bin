import * as Router from 'koa-router';
import * as Koa from 'koa';
import requireAuth = require('../../middleware/require-auth');
import { canAccessAnnotationInParams } from '../../middleware/can-access-annotation';
import { canAccessTaskInParams } from '../../middleware/can-access-task';
import { canAccessDesignInParam } from '../../middleware/can-access-design';

const router = new Router();

/**
 * Checks if the authenticated user has access to the given task.
 * Responds with a 200 if there's a match, otherwise throws a 400.
 */
function* getAnnotationsAccess(
  this: Koa.Application.Context
): IterableIterator<any> {
  this.status = 200;
}

interface NotificationAccessQuery {
  userId?: string;
}

/**
 * Checks the state's userId against the query param's userId;
 * Responds with a 200 if there's a match, otherwise throws a 400.
 */
function* getNotificationAccess(
  this: Koa.Application.Context
): IterableIterator<any> {
  const { userId } = this.state;
  const { userId: checkUserId }: NotificationAccessQuery = this.query;

  if (userId !== checkUserId) {
    return this.throw(
      400,
      "The user id in the query does not match the session's user!"
    );
  }

  this.status = 200;
}

/**
 * Checks if the authenticated user has access to the given task.
 * Responds with a 200 if there's a match, otherwise throws a 400.
 */
function* getTasksAccess(this: Koa.Application.Context): IterableIterator<any> {
  this.status = 200;
}

/**
 * Checks if the authenticated user has access to the given design.
 * Responds with a 200 and permissions object if there's a match,
 * otherwise throws a 400.
 */
function* getDesignAccess(
  this: Koa.Application.Context
): IterableIterator<any> {
  this.status = 200;
  this.body = this.state.permissions;
}

router.get('/notifications', requireAuth, getNotificationAccess);
router.get(
  '/annotations/:annotationId',
  requireAuth,
  canAccessAnnotationInParams,
  getAnnotationsAccess
);
router.get(
  '/tasks/:taskId',
  requireAuth,
  canAccessTaskInParams,
  getTasksAccess
);
router.get(
  '/designs/:designId',
  requireAuth,
  canAccessDesignInParam,
  getDesignAccess
);

export default router.routes();
