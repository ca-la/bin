import Router from "koa-router";
import convert from "koa-convert";

import db from "../../services/db";
import * as AnnotationCommentsDAO from "../../components/annotation-comments/dao";
import * as CommentDAO from "./dao";
import requireAuth = require("../../middleware/require-auth");
import { announceAnnotationCommentDeletion } from "../iris/messages/annotation-comment";
import { announceTaskCommentDeletion } from "../iris/messages/task-comment";
import { announceApprovalStepCommentDeletion } from "../iris/messages/approval-step-comment";
import { requireQueryParam } from "../../middleware/require-query-param";
import { StrictContext } from "../../router-context";

const router = new Router();

interface GetListContext
  extends StrictContext<
    AnnotationCommentsDAO.AnnotationToCommentsWithMentions
  > {
  query: { annotationIds: string[] };
}

async function getList(ctx: GetListContext) {
  const { annotationIds } = ctx.query;

  const idList = Array.isArray(annotationIds) ? annotationIds : [annotationIds];

  const commentsByAnnotation = await AnnotationCommentsDAO.findByAnnotationIds(
    db,
    idList
  );

  ctx.body = commentsByAnnotation;
  ctx.status = 200;
}

interface DeleteCommentContext extends StrictContext {
  query: {
    annotationId?: string;
    taskId?: string;
    approvalStepId?: string;
  };
  params: {
    commentId: string;
  };
}

async function deleteComment(ctx: DeleteCommentContext) {
  const { userId } = ctx.state;
  const { annotationId, taskId, approvalStepId } = ctx.query;
  const { commentId } = ctx.params;
  const comment = await CommentDAO.findById(commentId);

  ctx.assert(comment, 404);

  await CommentDAO.deleteById(commentId);

  if (annotationId) {
    await announceAnnotationCommentDeletion({
      actorId: userId,
      annotationId,
      commentId,
    });
  } else if (taskId) {
    await announceTaskCommentDeletion({ actorId: userId, commentId, taskId });
  } else if (approvalStepId) {
    await announceApprovalStepCommentDeletion({
      actorId: userId,
      approvalStepId,
      commentId,
    });
  }

  ctx.status = 204;
}

router.get(
  "/",
  requireAuth,
  requireQueryParam("annotationIds"),
  convert.back(getList)
);
router.del("/:commentId", requireAuth, convert.back(deleteComment));

export default router.routes();
