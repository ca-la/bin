import Router from "koa-router";
import { pick } from "lodash";
import Knex from "knex";

import {
  BASE_COMMENT_PROPERTIES,
  isBaseComment,
} from "../comments/domain-object";
import * as AnnotationCommentDAO from "../annotation-comments/dao";
import sendCreationNotifications from "./send-creation-notifications";
import requireAuth = require("../../middleware/require-auth");
import { announceAnnotationCommentCreation } from "../iris/messages/annotation-comment";
import db from "../../services/db";
import Asset from "../assets/types";
import { createCommentWithAttachments } from "../../services/create-comment-with-attachments";
import { addAtMentionDetailsForComment } from "../../services/add-at-mention-details";
import { BaseComment, CommentWithMentions } from "../comments/types";

const router = new Router();

function* createAnnotationComment(
  this: AuthedContext<BaseComment & { attachments: Asset[] }>
): Iterator<any, any, any> {
  const userId = this.state.userId;
  const body = pick(this.request.body, BASE_COMMENT_PROPERTIES);
  const attachments: Asset[] = this.request.body.attachments || [];
  const { annotationId } = this.params;
  if (body && isBaseComment(body) && annotationId) {
    return db.transaction(async (trx: Knex.Transaction) => {
      const comment = await createCommentWithAttachments(trx, {
        comment: body,
        attachments,
        userId,
      });

      const annotationComment = await AnnotationCommentDAO.create(
        {
          annotationId,
          commentId: comment.id,
        },
        trx
      );

      await announceAnnotationCommentCreation(annotationComment, comment);
      await sendCreationNotifications(trx, {
        actorUserId: this.state.userId,
        annotationId,
        comment,
      });
      const commentWithMentions: CommentWithMentions = await addAtMentionDetailsForComment(
        comment
      );

      this.status = 201;
      this.body = commentWithMentions;
    });
  }
  this.throw(400, `Request does not match model: ${Object.keys(body)}`);
}

router.put("/:commentId", requireAuth, createAnnotationComment);

export default router.routes();
