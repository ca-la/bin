import * as Router from 'koa-router';
import * as Koa from 'koa';

import * as CollectionStagesDAO from '../../dao/collection-stages';
import CollectionStage, {
  CollectionStageRequest,
  isCollectionStageRequest
} from '../../domain-objects/collection-stage';
import requireAuth = require('../../middleware/require-auth');

const router = new Router();

function* create(this: Koa.Application.Context): AsyncIterableIterator<CollectionStage> {
  if (!isCollectionStageRequest(this.request.body)) {
    return this.throw(400, 'Invalid request body');
  }

  const body: CollectionStageRequest = this.request.body;
  const collectionStage: CollectionStage = yield CollectionStagesDAO.create(body);
  this.body = collectionStage;
  this.status = 201;
}

interface GetListQuery {
  collectionId?: string;
}

function* getList(this: Koa.Application.Context): AsyncIterableIterator<CollectionStage> {
  const query: GetListQuery = this.query;

  if (!query.collectionId) {
    return this.throw(400, 'Missing collection ID');
  }

  const stages: CollectionStage[] = yield CollectionStagesDAO
    .findAllByCollectionId(query.collectionId);

  this.body = stages;
  this.status = 200;
}

router.post('/', requireAuth, create);
router.get('/', requireAuth, getList);

export = router.routes();
