import Router from "koa-router";
import Knex from "knex";
import convert from "koa-convert";
import { omit } from "lodash";
import { z } from "zod";

import * as CanvasesDAO from "./dao";
import requireAuth = require("../../middleware/require-auth");
import * as ComponentsDAO from "../components/dao";
import Canvas from "./domain-object";
import {
  serializedComponentArraySchema,
  serializedComponentSchema,
} from "../components/types";
import { nullableDateStringToNullableDate } from "../../services/zod-helpers";
import * as EnrichmentService from "../../services/enrich-component";
import db from "../../services/db";
import filterError = require("../../services/filter-error");
import { hasProperties } from "../../services/require-properties";
import { parseContext } from "../../services/parse-context";
import { gatherChanges } from "./services/gather-changes";
import { NonSplittableComponentError } from "../components/split";
import * as CanvasSplitService from "./services/split";
import {
  CanvasWithComponent,
  createCanvasAndComponents,
} from "./services/create-canvas-and-components";
import { StrictContext } from "../../router-context";
import useTransaction, {
  TransactionState,
} from "../../middleware/use-transaction";
import { logClientError } from "../../services/logger";
import { CanvasWithEnrichedComponents } from "./types";

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

interface CreateCanvasContext
  extends StrictContext<CanvasWithEnrichedComponents[]> {
  state: AuthedState;
}

async function createWithComponents(ctx: CreateCanvasContext) {
  // Schema is validated before creating
  const body: Unsaved<CanvasWithComponent>[] = ctx.request.body as any;

  ctx.assert(body.length >= 1, 400, "At least one canvas must be provided");

  const canvases: CanvasWithEnrichedComponents[] = [];
  await db.transaction(async (trx: Knex.Transaction) => {
    for (const unsavedCanvas of body) {
      if (!unsavedCanvas || !isCanvasWithComponent(unsavedCanvas)) {
        throw new Error("Request does not match Schema");
      }

      const canvas = await createCanvasAndComponents(
        trx,
        ctx.state.userId,
        unsavedCanvas
      );
      canvases.push(canvas);
    }

    if (canvases.length !== body.length) {
      throw new Error("Unable to create all canvases");
    }
  });

  ctx.status = 201;
  ctx.body = canvases;
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

      const enrichedComponents = await EnrichmentService.enrichComponentsList(
        trx,
        components
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

      const enrichedComponents = await EnrichmentService.enrichComponentsList(
        trx,
        components
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
  const enrichedComponents = yield EnrichmentService.enrichComponentsList(
    db,
    components
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
    const updatedCanvases: Canvas[] = [];
    for (const canvasGroupUpdate of patchList) {
      const { id, ...patch } = canvasGroupUpdate;
      const updatedCanvas = await CanvasesDAO.update(
        trx,
        id,
        patch as MaybeUnsaved<Canvas>
      ).catch(
        filterError(CanvasNotFoundError, (err: CanvasNotFoundError) => {
          ctx.throw(404, err);
        })
      );

      updatedCanvases.push(updatedCanvas);
    }

    const canvasWithComponentsList: CanvasWithEnrichedComponents[] = [];
    for (const canvas of updatedCanvases) {
      const components = await ComponentsDAO.findAllByCanvasId(canvas.id, trx);
      const enrichedComponents = await EnrichmentService.enrichComponentsList(
        trx,
        components
      );
      const enrichedCanvas = { ...canvas, components: enrichedComponents };
      canvasWithComponentsList.push(enrichedCanvas);
    }

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

  const enrichedCanvases: CanvasWithEnrichedComponents[] = [];
  for (const result of results) {
    const enrichedComponents = await EnrichmentService.enrichComponentsList(
      ctx.state.trx,
      result.components
    );

    const enrichedCanvas = {
      ...result.canvas,
      components: enrichedComponents,
    };

    enrichedCanvases.push(enrichedCanvas);
  }

  ctx.body = enrichedCanvases;

  ctx.status = 201;
}

router.post("/", requireAuth, convert.back(createWithComponents));
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
