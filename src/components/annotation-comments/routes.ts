import Router from "koa-router";
import { pick } from "lodash";

import {
  BASE_COMMENT_PROPERTIES,
  isBaseComment,
} from "../comments/domain-object";
import * as AnnotationCommentDAO from "../annotation-comments/dao";
import sendCreationNotifications from "./send-creation-notifications";
import requireAuth = require("../../middleware/require-auth");
import useTransaction from "../../middleware/use-transaction";
import { announceAnnotationCommentCreation } from "../iris/messages/annotation-comment";
import Asset from "../assets/types";
import { createCommentWithAttachments } from "../../services/create-comment-with-attachments";
import { addAtMentionDetailsForComment } from "../../services/add-at-mention-details";
import { BaseComment, CommentWithMentions } from "../comments/types";

const router = new Router();

function* createAnnotationComment(
  this: TrxContext<AuthedContext<BaseComment & { attachments: Asset[] }>>
): Iterator<any, any, any> {
  const { userId, trx } = this.state;
  const { annotationId } = this.params;

  const body = pick(this.request.body, BASE_COMMENT_PROPERTIES);
  const attachments: Asset[] = this.request.body.attachments || [];

  if (!body || !isBaseComment(body) || !annotationId) {
    this.throw(400, `Request does not match model: ${Object.keys(body)}`);
  }

  const comment = yield createCommentWithAttachments(trx, {
    comment: body,
    attachments,
    userId,
  });

  const annotationComment = yield AnnotationCommentDAO.create(
    {
      annotationId,
      commentId: comment.id,
    },
    trx
  );

  yield announceAnnotationCommentCreation(trx, annotationComment, comment);
  yield sendCreationNotifications(trx, {
    actorUserId: this.state.userId,
    annotationId,
    comment,
  });
  const commentWithMentions: CommentWithMentions = yield addAtMentionDetailsForComment(
    trx,
    comment
  );

  this.status = 201;
  this.body = commentWithMentions;
}

router.put("/:commentId", requireAuth, useTransaction, createAnnotationComment);

export default router.routes();
