import Router from 'koa-router';
import Koa from 'koa';

import * as PlansDAO from './dao';

const router = new Router();

function* getAll(this: Koa.Application.Context): Iterator<any, any, any> {
  const plans = yield PlansDAO.findAll();
  this.status = 200;
  this.body = plans;
}

function* getById(this: Koa.Application.Context): Iterator<any, any, any> {
  const plan = yield PlansDAO.findById(this.params.planId);
  if (!plan) {
    return this.throw(404, 'Plan not found');
  }
  this.status = 200;
  this.body = plan;
}

router.get('/', getAll);
router.get('/:planId', getById);

export default router.routes();
