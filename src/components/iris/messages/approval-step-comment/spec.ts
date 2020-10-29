import tape from "tape";
import Knex from "knex";

import * as SendMessageService from "../../send-message";
import * as MentionDetailsService from "../../../../services/add-at-mention-details";
import { sandbox, test } from "../../../../test-helpers/fresh";
import {
  announceApprovalStepCommentCreation,
  announceApprovalStepCommentDeletion,
} from "./index";
import generateComment from "../../../../test-helpers/factories/comment";
import { CommentWithAttachmentLinks } from "../../../../services/add-attachments-links";
import ApprovalStepComment from "../../../approval-step-comments/domain-object";
import db from "../../../../services/db";

test("announceApprovalStepCommentCreation supports sending a message", async (t: tape.Test) => {
  const sendStub = sandbox()
    .stub(SendMessageService, "sendMessage")
    .resolves({});
  const { comment } = await generateComment();
  const stepComment: ApprovalStepComment = {
    approvalStepId: "approval-step-one",
    commentId: comment.id,
  };
  const mentionStub = sandbox()
    .stub(MentionDetailsService, "default")
    .resolves([
      {
        ...comment,
        mentions: {},
      },
    ]);

  const response = await db.transaction((trx: Knex.Transaction) =>
    announceApprovalStepCommentCreation(
      trx,
      stepComment,
      comment as CommentWithAttachmentLinks
    )
  );
  t.deepEqual(
    response,
    {
      actorId: comment.userId,
      approvalStepId: "approval-step-one",
      resource: { ...comment, mentions: {} },
      type: "approval-step-comment",
    },
    "Returns the realtime message that was sent"
  );
  t.true(sendStub.calledOnce);
  t.true(mentionStub.calledOnce);
});

test("announceApprovalStepCommentDeletion supports sending a message", async (t: tape.Test) => {
  const sendStub = sandbox()
    .stub(SendMessageService, "sendMessage")
    .resolves({});
  const { comment } = await generateComment();

  const response = await announceApprovalStepCommentDeletion({
    commentId: comment.id,
    approvalStepId: "approval-step-one",
    actorId: comment.userId,
  });

  t.deepEqual(
    response,
    {
      actorId: comment.userId,
      approvalStepId: "approval-step-one",
      resource: { id: comment.id },
      type: "approval-step-comment/delete",
    },
    "Returns the realtime message that was sent"
  );
  t.true(sendStub.calledOnce);
});
