import * as Router from 'koa-router';
import * as Koa from 'koa';

import requireAuth = require('../../middleware/require-auth');
import Timeline from './domain-object';
import * as Service from './service';
import * as CollectionsDAO from '../../dao/collections';
import { getCollectionPermissions } from '../../services/get-permissions';

const router = new Router();

interface GetListQuery {
  collectionId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

function* getList(
  this: Koa.Application.Context
): AsyncIterableIterator<Timeline[]> {
  const query: GetListQuery = this.query;

  if (!query.collectionId && !query.userId) {
    return this.throw(400, 'Missing collection or user id');
  }
  const { limit, offset } = this.query;

  if (query.collectionId) {
    const { role, userId } = this.state;
    const collection = yield CollectionsDAO.findById(query.collectionId);
    const permissions = yield getCollectionPermissions(
      collection,
      role,
      userId
    );
    this.assert(
      permissions && permissions.canView,
      403,
      "You don't have permission to view this collection"
    );

    this.status = 200;
    this.body = yield Service.findAllByCollectionId(query.collectionId);
  } else if (query.userId) {
    this.status = 200;
    this.body = yield Service.findAllByUserId(
      query.userId,
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined
    );
  }
}

router.get('/', requireAuth, getList);

export default router.routes();
