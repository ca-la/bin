import tape from "tape";

import * as SendMessageService from "../../send-message";
import { sandbox, test } from "../../../../test-helpers/fresh";
import {
  announceApprovalStepCommentCreation,
  announceApprovalStepCommentDeletion,
} from "./index";
import generateComment from "../../../../test-helpers/factories/comment";
import ApprovalStepComment from "../../../approval-step-comments/domain-object";
import { CommentWithResources } from "../../../comments/types";

test("announceApprovalStepCommentCreation supports sending a message", async (t: tape.Test) => {
  const sendStub = sandbox()
    .stub(SendMessageService, "sendMessage")
    .resolves({});
  const { comment } = await generateComment();
  const stepComment: ApprovalStepComment = {
    approvalStepId: "approval-step-one",
    commentId: comment.id,
  };

  await announceApprovalStepCommentCreation(stepComment, {
    ...comment,
    mentions: {},
  } as CommentWithResources);

  t.deepEqual(
    sendStub.args,
    [
      [
        {
          type: "approval-step-comment/created",
          channels: ["approval-steps/approval-step-one"],
          resource: {
            comment: { ...comment, mentions: {} },
            approvalStepComment: {
              approvalStepId: "approval-step-one",
              commentId: comment.id,
            },
          },
        },
      ],
    ],
    "calls send with the correct message"
  );
});

test("announceApprovalStepCommentDeletion supports sending a message", async (t: tape.Test) => {
  const sendStub = sandbox()
    .stub(SendMessageService, "sendMessage")
    .resolves({});
  const { comment } = await generateComment();

  await announceApprovalStepCommentDeletion({
    commentId: comment.id,
    approvalStepId: "approval-step-one",
  });

  t.deepEqual(
    sendStub.args,
    [
      [
        {
          resource: {
            commentId: comment.id,
            approvalStepId: "approval-step-one",
          },
          channels: ["approval-steps/approval-step-one"],
          type: "approval-step-comment/deleted",
        },
      ],
    ],
    "calls send with the correct message"
  );
});
