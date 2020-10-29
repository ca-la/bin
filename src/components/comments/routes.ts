import Router from "koa-router";

import * as AnnotationCommentsDAO from "../../components/annotation-comments/dao";
import * as CommentDAO from "./dao";
import requireAuth = require("../../middleware/require-auth");
import { announceAnnotationCommentDeletion } from "../iris/messages/annotation-comment";
import { announceTaskCommentDeletion } from "../iris/messages/task-comment";
import { announceApprovalStepCommentDeletion } from "../iris/messages/approval-step-comment";
import useTransaction from "../../middleware/use-transaction";
import { requireQueryParam } from "../../middleware/require-query-param";

const router = new Router();

interface GetListQuery {
  annotationIds: string[];
}

function* getList(
  this: TrxContext<AuthedContext<{}, {}, GetListQuery>>
): Iterator<any, any, any> {
  const { annotationIds } = this.query;
  const { trx } = this.state;

  const idList = Array.isArray(annotationIds) ? annotationIds : [annotationIds];

  const commentsByAnnotation = yield AnnotationCommentsDAO.findByAnnotationIds(
    trx,
    idList
  );

  this.body = commentsByAnnotation;
  this.status = 200;
}

interface DeleteCommentQuery {
  annotationId?: string;
  taskId?: string;
  approvalStepId?: string;
}

function* deleteComment(this: AuthedContext): Iterator<any, any, any> {
  const { userId } = this.state;
  const {
    annotationId,
    taskId,
    approvalStepId,
  }: DeleteCommentQuery = this.query;
  const { commentId } = this.params;
  const comment = yield CommentDAO.findById(commentId);

  this.assert(comment, 404);

  yield CommentDAO.deleteById(commentId);

  if (annotationId) {
    yield announceAnnotationCommentDeletion({
      actorId: userId,
      annotationId,
      commentId,
    });
  } else if (taskId) {
    yield announceTaskCommentDeletion({ actorId: userId, commentId, taskId });
  } else if (approvalStepId) {
    yield announceApprovalStepCommentDeletion({
      actorId: userId,
      approvalStepId,
      commentId,
    });
  }

  this.status = 204;
}

router.get(
  "/",
  requireAuth,
  requireQueryParam("annotationIds"),
  useTransaction,
  getList
);
router.del("/:commentId", requireAuth, deleteComment);

export default router.routes();
