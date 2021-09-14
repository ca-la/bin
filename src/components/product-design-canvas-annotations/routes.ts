import Router from "koa-router";
import convert from "koa-convert";
import { z } from "zod";

import db from "../../services/db";
import { ProductDesignCanvasAnnotation as Annotation } from "./types";
import { create, deleteById, update, findNotEmptyByDesign } from "./dao";
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
import { parseContext } from "../../services/parse-context";

const router = new Router();

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

const getListContextSchema = z.object({
  query: z.object({ designId: z.string() }),
});

async function getList(ctx: StrictContext<Annotation[]>) {
  const { query } = parseContext(ctx, getListContextSchema);

  const annotations: Annotation[] = await findNotEmptyByDesign(
    db,
    query.designId
  );

  ctx.status = 200;
  ctx.body = annotations;
}

async function getAnnotationComments(ctx: AuthedContext) {
  const comments = await AnnotationCommentDAO.findByAnnotationId(db, {
    annotationId: ctx.params.annotationId,
  });
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
