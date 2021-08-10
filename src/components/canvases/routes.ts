import Router from "koa-router";
import Knex from "knex";
import convert from "koa-convert";

import * as CanvasesDAO from "./dao";
import requireAuth = require("../../middleware/require-auth");
import * as ComponentsDAO from "../components/dao";
import ProductDesignOptionsDAO from "../../dao/product-design-options";
import * as ProductDesignImagesDAO from "../assets/dao";
import Canvas from "./domain-object";
import {
  Component,
  ComponentType,
  serializedComponentArraySchema,
  serializedComponentSchema,
} from "../components/types";
import * as EnrichmentService from "../../services/attach-asset-links";
import db from "../../services/db";
import filterError = require("../../services/filter-error");
import ProductDesignImage from "../assets/types";
import ProductDesignOption from "../../domain-objects/product-design-option";
import { hasProperties } from "../../services/require-properties";
import { omit } from "lodash";
import { typeGuard, typeGuardFromSchema } from "../../middleware/type-guard";
import { gatherChanges } from "./services/gather-changes";
import { deserializeAsset } from "../assets/services/serializer";
import { Serialized } from "../../types/serialized";
import { NonSplittableComponentError } from "../components/split";
import * as CanvasSplitService from "./services/split";
import { StrictContext } from "../../router-context";
import useTransaction, {
  TransactionState,
} from "../../middleware/use-transaction";
import { logClientError, logServerError } from "../../services/logger";

const router = new Router();

type CanvasNotFoundError = CanvasesDAO.CanvasNotFoundError;
const { CanvasNotFoundError } = CanvasesDAO;

function isSaveableCanvas(obj: any): obj is MaybeUnsaved<Canvas> {
  return hasProperties(
    obj,
    "createdBy",
    "designId",
    "title",
    "width",
    "height",
    "x",
    "y"
  );
}

const attachUser = (request: any, userId: string): any => {
  return {
    ...request,
    createdBy: userId,
  };
};

function* create(this: AuthedContext): Iterator<any, any, any> {
  if (Array.isArray(this.request.body)) {
    yield createWithComponents;
  } else {
    yield createCanvas;
  }
}

function* createCanvas(this: AuthedContext): Iterator<any, any, any> {
  const body = attachUser(this.request.body, this.state.userId);
  if (!this.request.body || !isSaveableCanvas(body)) {
    this.throw(400, "Request does not match Canvas");
  }

  const canvas = yield CanvasesDAO.create(body);
  this.status = 201;
  this.body = { ...canvas, components: [] };
}

type ComponentWithImageAndOption = Component & {
  image: Serialized<ProductDesignImage>;
  option?: ProductDesignOption;
};

type CanvasWithComponent = Canvas & {
  components: ComponentWithImageAndOption[];
};

type CanvasWithEnrichedComponents = Canvas & {
  components: EnrichmentService.EnrichedComponent[];
};

function isCanvasWithComponent(data: any): data is CanvasWithComponent {
  const isCanvasInstance = isSaveableCanvas(omit(data, "components"));
  const components = serializedComponentArraySchema.safeParse(data.components);
  const isComponents = components.success;

  if (!components.success) {
    logClientError(components.error);
  }

  const isImages = data.components.every((component: any) =>
    hasProperties(component.image, "userId", "mimeType", "id")
  );

  return isCanvasInstance && isComponents && isImages;
}

function* createWithComponents(this: AuthedContext): Iterator<any, any, any> {
  const body: Unsaved<CanvasWithComponent>[] = this.request.body as any;

  this.assert(body.length >= 1, 400, "At least one canvas must be provided");

  const canvases: CanvasWithEnrichedComponents[] = yield Promise.all(
    body.map(async (data: Unsaved<CanvasWithComponent>) =>
      createCanvasAndComponents(this.state.userId, data)
    )
  );

  if (canvases.length < 1) {
    throw new Error("No canvases were succesfully created");
  }

  this.status = 201;
  this.body = canvases;
}

async function createCanvasAndComponents(
  userId: string,
  data: Unsaved<CanvasWithComponent>
): Promise<Canvas & { components: EnrichmentService.EnrichedComponent[] }> {
  if (!data || !isCanvasWithComponent(data)) {
    throw new Error("Request does not match Schema");
  }

  const enrichedComponents = await Promise.all(
    data.components.map(
      async (
        component: ComponentWithImageAndOption
      ): Promise<EnrichmentService.EnrichedComponent> => {
        return createComponent(component, userId);
      }
    )
  );
  const canvasWithUser = attachUser(omit(data, "components"), userId);
  const createdCanvas = await CanvasesDAO.create({
    ...canvasWithUser,
    deletedAt: null,
  });

  return { ...createdCanvas, components: enrichedComponents };
}

async function createComponent(
  component: ComponentWithImageAndOption,
  userId: string
): Promise<EnrichmentService.EnrichedComponent> {
  const { image } = component;
  const deserializedImgae = deserializeAsset(image);
  await ProductDesignImagesDAO.create({
    ...deserializedImgae,
    userId,
  });

  if (component.type === ComponentType.Material) {
    await ProductDesignOptionsDAO.create({
      ...component.option,
      deletedAt: null,
    });
  }

  const safeComponent = serializedComponentSchema.safeParse(
    attachUser(component, userId)
  );
  if (!safeComponent.success) {
    logServerError(safeComponent.error);
    throw new Error("Could not create component");
  }

  const created = await ComponentsDAO.create(safeComponent.data);
  return EnrichmentService.addAssetLink(created);
}

function* addComponent(this: AuthedContext): Iterator<any, any, any> {
  const { assetLink, ...body } = attachUser(
    this.request.body,
    this.state.userId
  );

  const safeComponent = serializedComponentSchema.safeParse(body);
  if (!safeComponent.success) {
    logServerError(safeComponent.error);
    throw new Error("Could not create component");
  }

  const component = yield ComponentsDAO.create(safeComponent.data);
  const canvas = yield CanvasesDAO.findById(this.params.canvasId);

  const updatedCanvas = yield CanvasesDAO.update(this.params.canvasId, {
    ...canvas,
    componentId: component.id,
  });
  const components = yield ComponentsDAO.findAllByCanvasId(canvas.id);
  this.status = 200;
  this.body = { ...updatedCanvas, components };
}

function* update(this: AuthedContext): Iterator<any, any, any> {
  const body = attachUser(this.request.body, this.state.userId);
  if (!this.request.body || !isSaveableCanvas(body)) {
    this.throw(400, "Request does not match Canvas");
  }

  const updatedCanvas = yield CanvasesDAO.update(
    this.params.canvasId,
    body
  ).catch(
    filterError(CanvasNotFoundError, (err: CanvasNotFoundError) => {
      this.throw(404, err);
    })
  );
  const components = yield ComponentsDAO.findAllByCanvasId(updatedCanvas.id);
  const enrichedComponents = yield Promise.all(
    components.map(EnrichmentService.addAssetLink)
  );
  this.status = 200;
  this.body = {
    ...updatedCanvas,
    components: enrichedComponents,
  };
}

type ReorderRequest = CanvasesDAO.ReorderRequest;

function isReorderRequest(data: any[]): data is ReorderRequest[] {
  return data.every((value: any) => hasProperties(value, "id", "ordering"));
}

function* reorder(
  this: AuthedContext<ReorderRequest[]>
): Iterator<any, any, any> {
  yield CanvasesDAO.reorder(this.request.body);
  this.status = 204;
}

function* del(this: AuthedContext): Iterator<any, any, any> {
  yield db.transaction((trx: Knex.Transaction) =>
    CanvasesDAO.del(trx, this.params.canvasId).catch(
      filterError(CanvasNotFoundError, (err: CanvasNotFoundError) => {
        this.throw(404, err);
      })
    )
  );
  this.status = 204;
}

function* getById(this: AuthedContext): Iterator<any, any, any> {
  const canvas = yield CanvasesDAO.findById(this.params.canvasId);
  this.assert(canvas, 404);
  const components = yield ComponentsDAO.findAllByCanvasId(canvas.id);
  const enrichedComponents = yield Promise.all(
    components.map(EnrichmentService.addAssetLink)
  );
  const enrichedCanvas = { ...canvas, components: enrichedComponents };

  this.status = 200;
  this.body = enrichedCanvas;
}

interface GetListQuery {
  designId?: string;
}

function* getList(this: AuthedContext): Iterator<any, any, any> {
  const query: GetListQuery = this.query;

  if (!query.designId) {
    this.throw(400, "Missing designId");
  }

  const enrichedCanvases = yield CanvasesDAO.findAllWithEnrichedComponentsByDesignId(
    query.designId
  );

  this.status = 200;
  this.body = enrichedCanvases;
}

function* getChangeLog(this: AuthedContext): Iterator<any, any, any> {
  const { canvasId } = this.params;

  const changes = yield gatherChanges(canvasId);
  this.status = 200;
  this.body = changes;
}

interface SplitContext extends StrictContext<CanvasWithEnrichedComponents[]> {
  state: TransactionState & AuthedState;
  params: { canvasId: string };
}

async function splitCanvasPages(ctx: SplitContext): Promise<void> {
  const { canvasId } = ctx.params;

  const canvas = await CanvasesDAO.findById(canvasId);
  if (!canvas) {
    return ctx.throw(404, "Canvas not found");
  }

  const results = await CanvasSplitService.splitCanvas(ctx.state.trx, canvas)
    .catch(
      filterError(
        NonSplittableComponentError,
        (err: NonSplittableComponentError) => {
          ctx.throw(400, err.message);
        }
      )
    )
    .catch(
      filterError(
        CanvasesDAO.CanvasNotFoundError,
        (err: CanvasNotFoundError) => {
          ctx.throw(400, err.message);
        }
      )
    );

  const enrichedCanvases: CanvasWithEnrichedComponents[] = await Promise.all(
    results.map(
      async (
        result: CanvasSplitService.Result
      ): Promise<CanvasWithEnrichedComponents> => {
        const enrichedComponents = await Promise.all(
          result.components.map(EnrichmentService.addAssetLink)
        );
        return { ...result.canvas, components: enrichedComponents };
      }
    )
  );

  ctx.body = enrichedCanvases;

  ctx.status = 201;
}

router.post("/", requireAuth, create);
router.put("/:canvasId", requireAuth, create);
router.patch("/:canvasId", requireAuth, update);
router.patch(
  "/reorder",
  requireAuth,
  typeGuard<ReorderRequest[]>(isReorderRequest),
  reorder
);

router.put(
  "/:canvasId/component/:componentId",
  requireAuth,
  typeGuardFromSchema(serializedComponentSchema),
  addComponent
);
router.del("/:canvasId", requireAuth, del);

router.get("/", requireAuth, getList);
router.get("/:canvasId", requireAuth, getById);
router.get("/:canvasId/changes", requireAuth, getChangeLog);
router.post(
  "/:canvasId/split-pages",
  requireAuth,
  useTransaction,
  convert.back(splitCanvasPages)
);

export default router.routes();
