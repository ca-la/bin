import * as Router from 'koa-router';
import * as Koa from 'koa';

import * as ProductDesignStagesDAO from '../../dao/product-design-stages';
import ProductDesignStage, {
  isDesignStageRequest,
  ProductDesignStageRequest
} from '../../domain-objects/product-design-stage';
import requireAuth = require('../../middleware/require-auth');

const router = new Router();

function* create(this: Koa.Application.Context): IterableIterator<any> {
  if (!isDesignStageRequest(this.request.body)) {
    return this.throw(400, 'Invalid request body');
  }

  const body: ProductDesignStageRequest = this.request.body;
  const productDesignStage: ProductDesignStage = yield ProductDesignStagesDAO.create(
    body
  );
  this.body = productDesignStage;
  this.status = 201;
}

interface GetListQuery {
  designId?: string;
}

function* getList(this: Koa.Application.Context): IterableIterator<any> {
  const query: GetListQuery = this.query;

  if (!query.designId) {
    return this.throw(400, 'Missing design ID');
  }

  const stages: ProductDesignStage[] = yield ProductDesignStagesDAO.findAllByDesignId(
    query.designId
  );

  this.body = stages;
  this.status = 200;
}

function* getTitlesList(this: Koa.Application.Context): IterableIterator<any> {
  const stageTitles: string[] = yield ProductDesignStagesDAO.findAllTitles();

  this.body = stageTitles;
  this.status = 200;
}

router.post('/', requireAuth, create);
router.get('/', requireAuth, getList);
router.get('/titles', requireAuth, getTitlesList);

export = router.routes();
