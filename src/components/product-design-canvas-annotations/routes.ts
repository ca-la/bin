import Router from "koa-router";
import convert from "koa-convert";
import { z } from "zod";

import db from "../../services/db";
import Annotation from "./domain-object";
import {
  create,
  deleteById,
  findAllByCanvasId,
  findAllWithCommentsByCanvasId,
  update,
  findAllWithCommentsByDesign,
} from "./dao";
import * as AnnotationCommentDAO from "../../components/annotation-comments/dao";
import ResourceNotFoundError from "../../errors/resource-not-found";
import requireAuth = require("../../middleware/require-auth");
import filterError = require("../../services/filter-error");
import addAtMentionDetails from "../../services/add-at-mention-details";
import { addAttachmentLinks } from "../../services/add-attachments-links";
import { StrictContext } from "../../router-context";
import {
  SafeBodyState,
  typeGuardFromSchema,
} from "../../middleware/type-guard";
import {
  dateStringToDate,
  nullableDateStringToNullableDate,
} from "../../services/zod-helpers";

const router = new Router();

interface GetListQuery {
  designId?: string;
  canvasId?: string;
  hasComments?: string;
}

const annotationFromIO = (request: Annotation, userId: string): Annotation => {
  return {
    ...request,
    createdBy: userId,
  };
};

const createOrUpdateAnnotationRequestSchema = z.object({
  canvasId: z.string(),
  createdAt: dateStringToDate,
  createdBy: z.string(),
  deletedAt: nullableDateStringToNullableDate,
  id: z.string(),
  x: z.number(),
  y: z.number(),
});
type CreateOrUpdateAnnotationRequest = z.infer<
  typeof createOrUpdateAnnotationRequestSchema
>;

interface CreateOrUpdateAnnotationContext extends StrictContext<Annotation> {
  state: AuthedState & SafeBodyState<CreateOrUpdateAnnotationRequest>;
}

async function createAnnotation(ctx: CreateOrUpdateAnnotationContext) {
  const { safeBody } = ctx.state;
  const annotation = await create(annotationFromIO(safeBody, ctx.state.userId));
  ctx.status = 201;
  ctx.body = annotation;
}

async function updateAnnotation(
  ctx: CreateOrUpdateAnnotationContext & { params: { annotationId: string } }
) {
  const { safeBody } = ctx.state;
  const annotation = await update(ctx.params.annotationId, safeBody);
  ctx.status = 200;
  ctx.body = annotation;
}

async function deleteAnnotation(
  ctx: StrictContext & { params: { annotationId: string } }
) {
  await deleteById(ctx.params.annotationId).catch(
    filterError(ResourceNotFoundError, () => {
      ctx.throw(404, "Annotation not found");
    })
  );

  ctx.status = 204;
}

async function getList(ctx: AuthedContext) {
  const query: GetListQuery = ctx.query;

  let annotations = [];

  if (query.canvasId && query.hasComments) {
    annotations = await findAllWithCommentsByCanvasId(db, query.canvasId);
  } else if (query.canvasId) {
    annotations = await findAllByCanvasId(db, query.canvasId);
  } else if (query.designId) {
    annotations = await findAllWithCommentsByDesign(db, query.designId);
  } else {
    ctx.throw(
      400,
      "Must provide either a canvasId or designId query parameter"
    );
  }

  ctx.status = 200;
  ctx.body = annotations;
}

async function getAnnotationComments(ctx: AuthedContext) {
  const comments = await AnnotationCommentDAO.findByAnnotationId(
    ctx.params.annotationId,
    db
  );
  if (comments) {
    const commentsWithMentions = await addAtMentionDetails(db, comments);
    const commentsWithAttachments = commentsWithMentions.map(
      addAttachmentLinks
    );
    ctx.status = 200;
    ctx.body = commentsWithAttachments;
  } else {
    ctx.throw(404);
  }
}

router.get("/", requireAuth, convert.back(getList));
router.put(
  "/:annotationId",
  requireAuth,
  typeGuardFromSchema<CreateOrUpdateAnnotationRequest>(
    createOrUpdateAnnotationRequestSchema
  ),
  convert.back(createAnnotation)
);
router.patch(
  "/:annotationId",
  requireAuth,
  typeGuardFromSchema<CreateOrUpdateAnnotationRequest>(
    createOrUpdateAnnotationRequestSchema
  ),
  convert.back(updateAnnotation)
);
router.del("/:annotationId", requireAuth, convert.back(deleteAnnotation));

router.get(
  "/:annotationId/comments",
  requireAuth,
  convert.back(getAnnotationComments)
);

export default router.routes();
