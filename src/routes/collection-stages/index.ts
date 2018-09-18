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
  if (this.request.body && isCollectionStageRequest(this.request.body)) {
    const body: CollectionStageRequest = this.request.body;
    const collectionStage: CollectionStage = yield CollectionStagesDAO.create(body);
    this.body = collectionStage;
    this.status = 201;
  } else {
    this.throw(400);
  }
}

router.post('/', requireAuth, create);

export = router.routes();
