import * as Router from 'koa-router';
import * as Koa from 'koa';
import requireAuth = require('../../middleware/require-auth');
import { getAllByDesign } from './services/get-all-by-design';
import { canAccessDesignInQuery } from '../../middleware/can-access-design';

const router = new Router();

interface GetAllQuery {
  designId?: string;
}

function* getAll(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const query: GetAllQuery = this.query;

  if (!query.designId) {
    return this.throw(400, 'Missing design id from query parameters!');
  }

  const resources = yield getAllByDesign(query.designId);
  this.status = 200;
  this.body = resources;
}

router.get('/', requireAuth, canAccessDesignInQuery, getAll);

export default router.routes();
