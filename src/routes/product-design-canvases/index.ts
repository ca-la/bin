import * as Router from 'koa-router';
import * as Koa from 'koa';

import * as ProductDesignCanvasesDAO from '../../dao/product-design-canvases';
import * as ComponentsDAO from '../../dao/components';
import * as ProductDesignsDAO from '../../dao/product-designs';
import ProductDesignCanvas, {
  isUnsavedProductDesignCanvas
} from '../../domain-objects/product-design-canvas';
import requireAuth = require('../../middleware/require-auth');
import { isUnsavedComponent } from '../../domain-objects/component';
import addAssetLink from '../../services/component-attach-asset-link';

const router = new Router();

const attachUser = (
  request: any,
  userId: string
): any => {
  return {
    ...request,
    createdBy: userId
  };
};

function* create(this: Koa.Application.Context): AsyncIterableIterator<ProductDesignCanvas> {
  const body = attachUser(this.request.body, this.state.userId);
  if (!this.request.body || !isUnsavedProductDesignCanvas(body)) {
    return this.throw(400, 'Request does not match ProductDesignCanvas');
  }

  const canvas = yield ProductDesignCanvasesDAO.create(body);
  this.status = 201;
  this.body = canvas;
}

function* addComponent(this: Koa.Application.Context): AsyncIterableIterator<ProductDesignCanvas> {
  const { assetLink, ...body } = attachUser(this.request.body, this.state.userId);
  if (!this.request.body || !isUnsavedComponent(body)) {
    return this.throw(400, 'Request does not match ProductDesignCanvas');
  }

  const component = yield ComponentsDAO.create(body);
  const canvas = yield ProductDesignCanvasesDAO.findById(this.params.canvasId);

  const design = yield ProductDesignsDAO.findById(canvas.designId);
  const previewImageUrls = design.previewImageUrls
    ? [...design.previewImageUrls, assetLink]
    : [assetLink];
  yield ProductDesignsDAO.update(canvas.designId, { previewImageUrls });

  const updatedCanvas = yield ProductDesignCanvasesDAO
    .update(this.params.canvasId, { ...canvas, componentId: component.id });
  const components = yield ComponentsDAO.findAllByCanvasId(canvas.id);
  this.status = 200;
  this.body = { ...updatedCanvas, components };
}

function* update(this: Koa.Application.Context): AsyncIterableIterator<ProductDesignCanvas> {
  const body = attachUser(this.request.body, this.state.userId);
  if (!this.request.body || !isUnsavedProductDesignCanvas(body)) {
    return this.throw(400, 'Request does not match ProductDesignCanvas');
  }

  const canvas = yield ProductDesignCanvasesDAO.update(this.params.canvasId, body);
  this.status = 200;
  this.body = canvas;
}

function* del(this: Koa.Application.Context): AsyncIterableIterator<ProductDesignCanvas> {
  yield ProductDesignCanvasesDAO.del(this.params.canvasId);
  this.status = 204;
}

function* getById(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const canvas = yield ProductDesignCanvasesDAO.findById(this.params.canvasId);
  this.assert(canvas, 404);
  const components = yield ComponentsDAO.findAllByCanvasId(canvas.id);
  const enrichedComponents = components.map(addAssetLink);
  const enrichedCanvas = { ...canvas, components: enrichedComponents };

  this.status = 200;
  this.body = enrichedCanvas;
}

interface GetListQuery {
  designId?: string;
}

function* getList(
  this: Koa.Application.Context
): AsyncIterableIterator<any[]> {
  const query: GetListQuery = this.query;

  if (!query.designId) {
    return this.throw(400, 'Missing designId');
  }

  const canvases = yield ProductDesignCanvasesDAO.findAllByDesignId(query.designId);
  const enrichedCanvases = yield canvases.map(async (canvas: ProductDesignCanvas) => {
    const components = await ComponentsDAO.findAllByCanvasId(canvas.id);
    const enrichedComponents = components.map(addAssetLink);
    return { ...canvas, components: enrichedComponents };
  });

  this.status = 200;
  this.body = enrichedCanvases;
}

router.post('/', requireAuth, create);
router.put('/:canvasId', requireAuth, create);
router.patch('/:canvasId', requireAuth, update);
router.put('/:canvasId/component/:componentId', requireAuth, addComponent);
router.del('/:canvasId', requireAuth, del);

router.get('/', requireAuth, getList);
router.get('/:canvasId', requireAuth, getById);

export = router.routes();
