import Router from 'koa-router';
import Koa from 'koa';
import { values } from 'lodash';

import requireAuth = require('../../middleware/require-auth');
import { taskTypes } from '../tasks/templates';

const router = new Router();

function* listTaskTypes(
  this: Koa.Application.Context
): Iterator<any, any, any> {
  const taskTypesList = values(taskTypes);

  this.body = taskTypesList;
  this.status = 200;
}

router.get('/', requireAuth, listTaskTypes);

export default router.routes();
