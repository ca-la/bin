import * as Router from 'koa-router';
import * as Koa from 'koa';
import { values } from 'lodash';

import requireAuth = require('../../middleware/require-auth');
import { taskTypes } from '../tasks/templates';

const router = new Router();

function* listTaskTypes(this: Koa.Application.Context): IterableIterator<any> {
  const taskTypesList = values(taskTypes);

  this.body = taskTypesList;
  this.status = 200;
}

router.get('/', requireAuth, listTaskTypes);

export default router.routes();
