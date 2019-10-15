import * as Router from 'koa-router';
import * as Koa from 'koa';

import requireAuth = require('../../middleware/require-auth');
import UserOnboarding, { isUserOnboarding } from './domain-object';
import { create, findByUserId } from './dao';

const router = new Router();

function* createOrUpdate(
  this: Koa.Application.Context
): AsyncIterableIterator<UserOnboarding> {
  const { body } = this.request;
  const { userId } = this.params;

  if (!isUserOnboarding(body)) {
    return this.throw(400, 'Request body does not match type');
  }
  if (userId !== this.state.userId && this.state.role !== 'ADMIN') {
    return this.throw(403, 'Access to this resource is denied');
  }

  this.status = 201;
  this.body = yield create(body);
}

function* getByUserId(
  this: Koa.Application.Context
): AsyncIterableIterator<UserOnboarding> {
  const { userId } = this.params;

  if (userId !== this.state.userId && this.state.role !== 'ADMIN') {
    return this.throw(403, 'Access to this resource is denied');
  }

  const userOnboarding = yield findByUserId(userId);
  if (!userOnboarding) {
    return this.throw(404, 'User Onboarding not found!');
  }
  this.status = 200;
  this.body = userOnboarding;
}

router.get('/:userId', requireAuth, getByUserId);
router.put('/:userId', requireAuth, createOrUpdate);

export default router.routes();
