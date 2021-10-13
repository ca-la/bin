import Router from "koa-router";
import Knex from "knex";
import convert from "koa-convert";
import { z } from "zod";

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
import { nullableDateStringToNullableDate } from "../../services/zod-helpers";
import * as EnrichmentService from "../../services/attach-asset-links";
import db from "../../services/db";
import filterError = require("../../services/filter-error");
import ProductDesignImage from "../assets/types";
import ProductDesignOption from "../../domain-objects/product-design-option";
import { hasProperties } from "../../services/require-properties";
import { omit } from "lodash";
import { parseContext } from "../../services/parse-context";
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

export const addComponentContextSchema = z.object({
  request: z.object({
    body: serializedComponentSchema,
  }),
  params: z.object({
    canvasId: z.string(),
  }),
});

interface AddComponentContext
  extends StrictContext<CanvasWithEnrichedComponents> {
  state: AuthedState;
}

async function addComponent(ctx: AddComponentContext) {
  const {
    request: { body: data },
    params,
  } = parseContext(ctx, addComponentContextSchema);

  const canvas = await CanvasesDAO.findById(params.canvasId);
  if (!canvas) {
    ctx.throw(404, `Canvas not found with id: ${params.canvasId}`);
  }

  const updatedCanvasWithEnrichedComponent = await db.transaction(
    async (trx: Knex.Transaction) => {
      const component = await ComponentsDAO.create(data, trx);
      const updatedCanvas = await CanvasesDAO.update(trx, params.canvasId, {
        ...canvas,
        componentId: component.id,
      });
      const components = await ComponentsDAO.findAllByCanvasId(canvas.id, trx);
      const enrichedComponents = await Promise.all(
        components.map(EnrichmentService.addAssetLink)
      );

      return { ...updatedCanvas, components: enrichedComponents };
    }
  );
  ctx.status = 200;
  ctx.body = updatedCanvasWithEnrichedComponent;
}

export const updateCanvasContextSchema = z.object({
  request: z.object({
    body: z
      .object({
        designId: z.string(),
        createdBy: z.string(),
        title: z.string(),
        width: z.number().nonnegative(),
        height: z.number().nonnegative(),
        x: z.number(),
        y: z.number(),
        ordering: z.number().int(),
        deletedAt: nullableDateStringToNullableDate,
        archivedAt: nullableDateStringToNullableDate,
      })
      .partial(),
  }),
  params: z.object({
    canvasId: z.string(),
  }),
});

interface UpdateCanvasContext
  extends StrictContext<CanvasWithEnrichedComponents> {
  state: AuthedState;
}

async function update(ctx: UpdateCanvasContext) {
  const {
    request: { body: patch },
    params,
  } = parseContext(ctx, updateCanvasContextSchema);

  const canvasWithEnrichedComponents = await db.transaction(
    async (trx: Knex.Transaction) => {
      const updatedCanvas = await CanvasesDAO.update(
        trx,
        params.canvasId,
        patch as MaybeUnsaved<Canvas>
      ).catch(
        filterError(CanvasNotFoundError, (err: CanvasNotFoundError) => {
          ctx.throw(404, err);
        })
      );
      const components = await ComponentsDAO.findAllByCanvasId(
        updatedCanvas.id,
        trx
      );
      const enrichedComponents = await Promise.all(
        components.map(EnrichmentService.addAssetLink)
      );

      return {
        ...updatedCanvas,
        components: enrichedComponents,
      };
    }
  );

  ctx.status = 200;
  ctx.body = canvasWithEnrichedComponents;
}

interface ReorderContext extends StrictContext {}

const reorderContextSchema = z.object({
  request: z.object({
    body: z.array(z.object({ id: z.string(), ordering: z.number() })),
  }),
});

async function reorder(ctx: ReorderContext) {
  const {
    request: { body },
  } = parseContext(ctx, reorderContextSchema);

  await db.transaction((trx: Knex.Transaction) =>
    CanvasesDAO.reorder(trx, body)
  );
  ctx.status = 204;
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

export const canvasGroupUpdateSchema = z.object({
  id: z.string(),
  archivedAt: nullableDateStringToNullableDate.optional(),
  ordering: z.number().int().optional(),
});
export type CanvasGroupUpdate = z.infer<typeof canvasGroupUpdateSchema>;

export const canvasesListUpdateSchema = z.object({
  request: z.object({
    body: z.array(canvasGroupUpdateSchema),
  }),
});

interface UpdateCanvasesListContext
  extends StrictContext<CanvasWithEnrichedComponents[]> {
  state: AuthedState;
}

async function updateCanvases(ctx: UpdateCanvasesListContext) {
  const {
    request: { body: patchList },
  } = parseContext(ctx, canvasesListUpdateSchema);

  const updatedList = await db.transaction(async (trx: Knex.Transaction) => {
    const updatedCanvases: Canvas[] = await Promise.all(
      patchList.map(
        async ({ id, ...patch }: CanvasGroupUpdate) =>
          await CanvasesDAO.update(
            trx,
            id,
            patch as MaybeUnsaved<Canvas>
          ).catch(
            filterError(CanvasNotFoundError, (err: CanvasNotFoundError) => {
              ctx.throw(404, err);
            })
          )
      )
    );

    const canvasWithComponentsList: CanvasWithEnrichedComponents[] = await Promise.all(
      updatedCanvases.map(async (canvas: Canvas) => {
        const components = await ComponentsDAO.findAllByCanvasId(
          canvas.id,
          trx
        );
        const enrichedComponents = await Promise.all(
          components.map(EnrichmentService.addAssetLink)
        );

        return { ...canvas, components: enrichedComponents };
      })
    );

    return canvasWithComponentsList;
  });

  ctx.status = 200;
  ctx.body = updatedList;
}

const canvasesListDeleteSchema = z.object({
  request: z.object({
    body: z.array(z.string()),
  }),
});

interface DeleteCanvasesListContext extends StrictContext {
  state: AuthedState;
}
async function deleteCanvases(ctx: DeleteCanvasesListContext) {
  const {
    request: { body: deleteList },
  } = parseContext(ctx, canvasesListDeleteSchema);

  await db.transaction(async (trx: Knex.Transaction) =>
    Promise.all(
      deleteList.map(async (id: string) =>
        CanvasesDAO.del(trx, id).catch(
          filterError(CanvasNotFoundError, (err: CanvasNotFoundError) => {
            ctx.throw(404, err);
          })
        )
      )
    )
  );

  ctx.status = 204;
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
router.patch("/:canvasId", requireAuth, convert.back(update));
router.patch("/reorder", requireAuth, convert.back(reorder));

router.patch("/", requireAuth, convert.back(updateCanvases));

router.put(
  "/:canvasId/component/:componentId",
  requireAuth,
  convert.back(addComponent)
);
router.del("/:canvasId", requireAuth, del);
router.del("/", requireAuth, convert.back(deleteCanvases));

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
