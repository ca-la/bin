import Router from 'koa-router';

import requireAuth = require('../../middleware/require-auth');
import { isUserOnboarding } from './domain-object';
import { create, findByUserId } from './dao';

const router = new Router();

function* createOrUpdate(this: AuthedContext): Iterator<any, any, any> {
  const { body } = this.request;
  const { userId } = this.params;

  if (!isUserOnboarding(body)) {
    this.throw(400, 'Request body does not match type');
  }
  if (userId !== this.state.userId && this.state.role !== 'ADMIN') {
    this.throw(403, 'Access to this resource is denied');
  }

  this.status = 201;
  this.body = yield create({
    partnerDashboardViewedAt: body.partnerDashboardViewedAt,
    tasksPageViewedAt: body.tasksPageViewedAt,
    timelinePageViewedAt: body.timelinePageViewedAt,
    userId,
    welcomeModalViewedAt: body.welcomeModalViewedAt
  });
}

function* getByUserId(this: AuthedContext): Iterator<any, any, any> {
  const { userId } = this.params;

  if (userId !== this.state.userId && this.state.role !== 'ADMIN') {
    this.throw(403, 'Access to this resource is denied');
  }

  const userOnboarding = yield findByUserId(userId);
  if (!userOnboarding) {
    this.throw(404, 'User Onboarding not found!');
  }
  this.status = 200;
  this.body = userOnboarding;
}

router.get('/:userId', requireAuth, getByUserId);
router.put('/:userId', requireAuth, createOrUpdate);

export default router.routes();
