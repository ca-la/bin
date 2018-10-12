import * as Router from 'koa-router';
import * as Koa from 'koa';

import * as ProductDesignCanvasesDAO from '../../dao/product-design-canvases';
import ProductDesignCanvas, {
  isUnsavedProductDesignCanvas
} from '../../domain-objects/product-design-canvas';
import requireAuth = require('../../middleware/require-auth');

const router = new Router();

function* create(this: Koa.Application.Context): AsyncIterableIterator<ProductDesignCanvas> {
  const body = {};
  Object.assign(body, this.request.body, { createdBy: this.state.userId });
  if (this.request.body && isUnsavedProductDesignCanvas(body)) {
    const canvas = yield ProductDesignCanvasesDAO.create(body);
    this.status = 201;
    this.body = canvas;
  } else {
    this.throw(400, 'Request does not match ProductDesignCanvas');
  }
}

function* update(this: Koa.Application.Context): AsyncIterableIterator<ProductDesignCanvas> {
  const body = {};
  Object.assign(body, this.request.body, { createdBy: this.state.userId });
  if (this.request.body && isUnsavedProductDesignCanvas(body)) {
    const canvas = yield ProductDesignCanvasesDAO.update(this.params.canvasId, body);
    this.status = 200;
    this.body = canvas;
  } else {
    this.throw(400, 'Request does not match ProductDesignCanvas');
  }
}

function* del(this: Koa.Application.Context): AsyncIterableIterator<ProductDesignCanvas> {
  if (this.params.canvasId) {
    const canvas = yield ProductDesignCanvasesDAO.del(this.params.canvasId);
    this.status = 204;
    this.body = canvas;
  } else {
    this.throw(400, 'Request needs to have canvasId as url param');
  }
}

function* getById(this: Koa.Application.Context): AsyncIterableIterator<ProductDesignCanvas> {
  const canvas = yield ProductDesignCanvasesDAO.findById(this.params.canvasId);

  this.assert(canvas, 404);

  this.status = 200;
  this.body = canvas;
}

interface GetListQuery {
  designId?: string;
}

function* getList(
  this: Koa.Application.Context
): AsyncIterableIterator<ProductDesignCanvas[]> {
  const query: GetListQuery = this.query;

  if (!query.designId) {
    return this.throw(400, 'Missing designId');
  }

  const canvas = yield ProductDesignCanvasesDAO.findAllByDesignId(query.designId);

  this.status = 200;
  this.body = canvas;
}

router.post('/', requireAuth, create);
router.put('/:canvasId', requireAuth, update);
router.del('/:canvasId', requireAuth, del);

router.get('/', requireAuth, getList);
router.get('/:canvasId', requireAuth, getById);

export = router.routes();