import * as Router from 'koa-router';
import * as Koa from 'koa';

import * as ProductDesignStagesDAO from '../../dao/product-design-stages';
import ProductDesignStage, {
  isDesignStageRequest,
  ProductDesignStageRequest
} from '../../domain-objects/product-design-stage';
import requireAuth = require('../../middleware/require-auth');

const router = new Router();

function* create(this: Koa.Application.Context): AsyncIterableIterator<ProductDesignStage> {
  if (!isDesignStageRequest(this.request.body)) {
    return this.throw(400, 'Invalid request body');
  }

  const body: ProductDesignStageRequest = this.request.body;
  const productDesignStage: ProductDesignStage = yield ProductDesignStagesDAO.create(body);
  this.body = productDesignStage;
  this.status = 201;
}

interface GetListQuery {
  designId?: string;
}

function* getList(this: Koa.Application.Context): AsyncIterableIterator<ProductDesignStage> {
  const query: GetListQuery = this.query;

  if (!query.designId) {
    return this.throw(400, 'Missing design ID');
  }

  const stages: ProductDesignStage[] = yield ProductDesignStagesDAO
    .findAllByDesignId(query.designId);

  this.body = stages;
  this.status = 200;
}

router.post('/', requireAuth, create);
router.get('/', requireAuth, getList);

export = router.routes();