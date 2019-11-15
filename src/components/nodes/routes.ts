import Router from 'koa-router';
import { keyBy } from 'lodash';
import { PhidiasNode } from '@cala/ts-lib/dist/phidias';
import requireAuth = require('../../middleware/require-auth');
import {
  getAllByDesign,
  getAllByDesignInclude
} from './services/get-all-by-design';
import { canAccessDesignInQuery } from '../../middleware/can-access-design';

const router = new Router();

interface GetAllQuery {
  designId?: string;
  include?: '*';
  keyBy?: 'id';
}

function* getAllInclude(this: AuthedContext): Iterator<any, any, any> {
  const query: GetAllQuery = this.query;

  if (!query.designId) {
    this.throw(400, 'Missing design id from query parameters!');
  }

  let resources:
    | PhidiasNode[]
    | { [nodeId: string]: PhidiasNode } = yield getAllByDesignInclude(
    query.designId
  );

  if (query.keyBy === 'id') {
    resources = keyBy(resources as PhidiasNode[], 'id');
  }

  this.status = 200;
  this.body = resources;
}

function* getAllByDesignId(this: AuthedContext): Iterator<any, any, any> {
  const query: GetAllQuery = this.query;

  if (!query.designId) {
    this.throw(400, 'Missing design id from query parameters!');
  }

  const resources = yield getAllByDesign(query.designId);
  this.status = 200;
  this.body = resources;
}

function* getAll(this: AuthedContext): Iterator<any, any, any> {
  const query: GetAllQuery = this.query;

  if (query.include === '*') {
    yield getAllInclude;
  } else {
    yield getAllByDesignId;
  }
}

router.get('/', requireAuth, canAccessDesignInQuery, getAll);

export default router.routes();
