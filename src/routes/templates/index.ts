import * as Router from 'koa-router';
import * as Koa from 'koa';

import * as TemplatesDAO from '../../dao/templates';
import requireAuth = require('../../middleware/require-auth');

const router = new Router();

function* getList(this: Koa.Application.Context): IterableIterator<any> {
  const templates = yield TemplatesDAO.findAll();

  this.status = 200;
  this.body = templates;
}

router.get('/', requireAuth, getList);

export = router.routes();
