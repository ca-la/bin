import Router from "koa-router";

import requireAuth = require("../../middleware/require-auth");
import useTransaction, {
  TransactionState,
} from "../../middleware/use-transaction";
import Asset from "../assets/types";
import { createCommentWithAttachments } from "../../services/create-comment-with-attachments";
import {
  CommentWithResources,
  CreateCommentWithAttachments,
  createCommentWithAttachmentsSchema,
} from "../comments/types";
import convert from "koa-convert";
import { StrictContext } from "../../router-context";
import {
  SafeBodyState,
  typeGuardFromSchema,
} from "../../middleware/type-guard";
import {
  attachDesignPermissions,
  canCommentOnDesign,
} from "../../middleware/can-access-design";
import * as AnnotationsDAO from "../product-design-canvas-annotations/dao";
import * as CanvasesDAO from "../canvases/dao";
import { createAndAnnounce } from "./service";

const router = new Router();

interface CreateCommentContext extends StrictContext<CommentWithResources> {
  state: AuthedState &
    TransactionState &
    SafeBodyState<CreateCommentWithAttachments>;
  params: { annotationId: string };
}

async function attachPermissions(ctx: CreateCommentContext, next: any) {
  const { trx } = ctx.state;
  const { annotationId } = ctx.params;

  const annotation = await AnnotationsDAO.findById(trx, annotationId);
  if (!annotation) {
    ctx.throw(404, `Annotation ${annotationId} not found`);
  }

  const canvas = await CanvasesDAO.findById(annotation.canvasId, trx);
  if (!canvas) {
    ctx.throw(404, `Canvas ${annotation.canvasId} not found`);
  }

  await attachDesignPermissions(ctx, canvas.designId);

  return next();
}

async function createAnnotationComment(ctx: CreateCommentContext) {
  const { userId, trx } = ctx.state;
  const { annotationId } = ctx.params;

  const attachments: Asset[] = ctx.state.safeBody.attachments || [];

  const comment = await createCommentWithAttachments(trx, {
    comment: ctx.state.safeBody,
    attachments,
    userId,
  });

  const commentWithResources = await createAndAnnounce(
    trx,
    annotationId,
    comment
  );

  ctx.status = 201;
  ctx.body = commentWithResources;
}

router.put(
  "/:commentId",
  requireAuth,
  typeGuardFromSchema<CreateCommentWithAttachments>(
    createCommentWithAttachmentsSchema
  ),
  useTransaction,
  convert.back(attachPermissions),
  canCommentOnDesign,
  convert.back(createAnnotationComment)
);

export default router.routes();
