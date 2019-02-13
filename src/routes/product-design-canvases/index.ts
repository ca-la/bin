import * as Router from 'koa-router';
import * as Koa from 'koa';

import * as ProductDesignCanvasesDAO from '../../dao/product-design-canvases';
import requireAuth = require('../../middleware/require-auth');
import * as ComponentsDAO from '../../dao/components';
import * as ProductDesignOptionsDAO from '../../dao/product-design-options';
import * as ProductDesignsDAO from '../../dao/product-designs';
import * as ProductDesignImagesDAO from '../../components/images/dao';
import ProductDesignCanvas, {
  isProductDesignCanvas, isUnsavedProductDesignCanvas
} from '../../domain-objects/product-design-canvas';
import Component, { ComponentType, isUnsavedComponent } from '../../domain-objects/component';
import * as EnrichmentService from '../../services/attach-asset-links';
import ProductDesignImage = require('../../components/images/domain-object');
import ProductDesignOption = require('../../domain-objects/product-design-option');
import { hasProperties } from '../../services/require-properties';
import { omit } from 'lodash';
import { typeGuard } from '../../middleware/type-guard';

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
  if (Array.isArray(this.request.body)) {
    yield createWithComponents;
  } else {
    yield createCanvas;
  }
}

function* createCanvas(this: Koa.Application.Context): AsyncIterableIterator<ProductDesignCanvas> {
  const body = attachUser(this.request.body, this.state.userId);
  if (!this.request.body || !isUnsavedProductDesignCanvas(body)) {
    return this.throw(400, 'Request does not match ProductDesignCanvas');
  }

  const canvas = yield ProductDesignCanvasesDAO.create(body);
  this.status = 201;
  this.body = canvas;
}

type ComponentWithImageAndOption = Component & {
  assetLink: string,
  downloadLink?: string,
  image: ProductDesignImage,
  option?: ProductDesignOption
};

type CanvasWithComponent = ProductDesignCanvas & { components: ComponentWithImageAndOption[]};

function isCanvasWithComponent(data: any): data is CanvasWithComponent {
  const isCanvas = isProductDesignCanvas(omit(data, 'components'));
  const isComponents = data.components.every((component: any) => isUnsavedComponent(component));
  const isImages = data.components.every((component: any) =>
    hasProperties(component.image, 'userId', 'mimeType', 'id'));

  return isCanvas && isComponents && isImages;
}

function* createWithComponents(
  this: Koa.Application.Context
): AsyncIterableIterator<ProductDesignCanvas> {
  const body: Unsaved<CanvasWithComponent>[] = (this.request.body as any);

  this.assert(body.length >= 1, 400, 'At least one canvas must be provided');

  const canvases: CanvasWithComponent[] = yield Promise.all(
    body.map(async (data: Unsaved<CanvasWithComponent>) =>
      createCanvasAndComponents(this.state.userId, data))
  );

  if (canvases.length < 1) {
    throw new Error('No canvases were succesfully created');
  }

  const assetLinks: string[] = canvases
    .reduce(
      (list: string[], canvas: CanvasWithComponent): string[] =>
        list.concat(canvas.components.map((component: ComponentWithImageAndOption) =>
          component.assetLink
        )
      ),
      []
    );

  yield updateDesignPreview(canvases[0].designId, assetLinks);
  this.status = 201;
  this.body = canvases;
}

async function createCanvasAndComponents(
  userId: string, data: Unsaved<CanvasWithComponent>
): Promise<ProductDesignCanvas & { components: ComponentWithImageAndOption[]}> {
  if (!data || !isCanvasWithComponent(data)) { throw new Error('Request does not match Schema'); }

  const enrichedComponents = await Promise.all(data.components.map(
    async (component: ComponentWithImageAndOption): Promise<ComponentWithImageAndOption> => {
      return createComponent(component, userId);
    })
  );
  const canvasWithUser = attachUser(omit(data, 'components'), userId);
  await ProductDesignCanvasesDAO.create({ ...canvasWithUser, deletedAt: null });

  return { ...canvasWithUser, components: enrichedComponents };
}

async function createComponent(
  component: ComponentWithImageAndOption,
  userId: string
): Promise<ComponentWithImageAndOption> {
  const image = component.image;
  const createdImage = await ProductDesignImagesDAO.create({ ...image, userId, deletedAt: null });
  let option;

  if (component.type === ComponentType.Material) {
    option = await ProductDesignOptionsDAO.create({ ...component.option, deletedAt: null });
  }

  const created = await ComponentsDAO.create(attachUser(component, userId));
  const enrichedComponent = await EnrichmentService.addAssetLink(created);
  return {
    ...enrichedComponent,
    image: createdImage,
    option
  };
}

async function updateDesignPreview(designId: string, assetLinks: string[]): Promise<void> {
  const design = await ProductDesignsDAO.findById(designId);
  if (!design) {
    throw new Error(`No design for id: ${designId}`);
  }
  const previewImageUrls = design.previewImageUrls
    ? design.previewImageUrls.concat(assetLinks)
    : assetLinks;
  await ProductDesignsDAO.update(designId, { previewImageUrls });
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

type ReorderRequest = ProductDesignCanvasesDAO.ReorderRequest;

function isReorderRequest(data: any[]): data is ReorderRequest[] {
  return data.every((value: any) => hasProperties(value, 'id', 'ordering'));
}

function* reorder(
  this: Koa.Application.Context<ReorderRequest[]>
): AsyncIterableIterator<ProductDesignCanvas> {
  const canvases = yield ProductDesignCanvasesDAO.reorder(this.request.body);
  this.status = 200;
  this.body = canvases;
}

function* del(this: Koa.Application.Context): AsyncIterableIterator<ProductDesignCanvas> {
  yield ProductDesignCanvasesDAO.del(this.params.canvasId);
  this.status = 204;
}

function* getById(this: Koa.Application.Context): AsyncIterableIterator<any> {
  const canvas = yield ProductDesignCanvasesDAO.findById(this.params.canvasId);
  this.assert(canvas, 404);
  const components = yield ComponentsDAO.findAllByCanvasId(canvas.id);
  const enrichedComponents = yield Promise.all(components.map(EnrichmentService.addAssetLink));
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
    const enrichedComponents = await Promise.all(components.map(EnrichmentService.addAssetLink));
    return { ...canvas, components: enrichedComponents };
  });

  this.status = 200;
  this.body = enrichedCanvases;
}

router.post('/', requireAuth, create);
router.put('/:canvasId', requireAuth, create);
router.patch('/:canvasId', requireAuth, update);
router.patch('/reorder', requireAuth, typeGuard<ReorderRequest[]>(isReorderRequest), reorder);

router.put('/:canvasId/component/:componentId', requireAuth, addComponent);
router.del('/:canvasId', requireAuth, del);

router.get('/', requireAuth, getList);
router.get('/:canvasId', requireAuth, getById);

export = router.routes();
