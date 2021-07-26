import Knex from "knex";

import { sandbox, test, Test } from "../../../test-helpers/fresh";
import * as AnnounceApprovalStepCommentService from "../../../components/iris/messages/approval-step-comment";
import * as AnnounceAnnotationCommentService from "../../../components/iris/messages/annotation-comment";
import * as AnnounceSubmissionCommentService from "../../../components/iris/messages/submission-comment";
import * as CommentsDAO from "../../../components/comments/dao";

import { Task } from "../types";
import { postProcessDeleteComment } from "./post-process-delete-comment";

const task: Task<"POST_PROCESS_DELETE_COMMENT"> = {
  deduplicationId: "a-comment-id",
  type: "POST_PROCESS_DELETE_COMMENT",
  keys: {
    commentId: "a-comment-id",
    actorId: "a-user-id",
  },
};

test("postProcessDeleteComment: approval step comment", async (t: Test) => {
  const trxStub = (sandbox().stub() as unknown) as Knex.Transaction;
  const findWithParentIdsStub = sandbox()
    .stub(CommentsDAO, "findWithParentIds")
    .resolves({
      commentId: "a-comment-id",
      approvalStepId: "an-approval-step-id",
      annotationId: null,
      submissionId: null,
    });
  const announceApprovalStepCommentDeletionStub = sandbox()
    .stub(
      AnnounceApprovalStepCommentService,
      "announceApprovalStepCommentDeletion"
    )
    .resolves();

  const result = await postProcessDeleteComment(trxStub, task);

  t.deepEqual(
    result,
    {
      type: "SUCCESS",
      message:
        "POST_PROCESS_DELETE_COMMENT task successfully completed for comment a-comment-id.",
    },
    "returns a success result"
  );

  t.deepEqual(
    findWithParentIdsStub.args,
    [[trxStub, "a-comment-id"]],
    "looks up comment's parent IDs"
  );

  t.deepEqual(
    announceApprovalStepCommentDeletionStub.args,
    [
      [
        {
          actorId: "a-user-id",
          approvalStepId: "an-approval-step-id",
          commentId: "a-comment-id",
        },
      ],
    ],
    "create realtime message for correct parent resource"
  );
});

test("postProcessDeleteComment: annotation comment", async (t: Test) => {
  const trxStub = (sandbox().stub() as unknown) as Knex.Transaction;
  const findWithParentIdsStub = sandbox()
    .stub(CommentsDAO, "findWithParentIds")
    .resolves({
      commentId: "a-comment-id",
      approvalStepId: null,
      annotationId: "an-annotation-id",
      submissionId: null,
    });
  const announceAnnotationCommentDeletionStub = sandbox()
    .stub(AnnounceAnnotationCommentService, "announceAnnotationCommentDeletion")
    .resolves();

  const result = await postProcessDeleteComment(trxStub, task);

  t.deepEqual(
    result,
    {
      type: "SUCCESS",
      message:
        "POST_PROCESS_DELETE_COMMENT task successfully completed for comment a-comment-id.",
    },
    "returns a success result"
  );

  t.deepEqual(
    findWithParentIdsStub.args,
    [[trxStub, "a-comment-id"]],
    "looks up comment's parent IDs"
  );

  t.deepEqual(
    announceAnnotationCommentDeletionStub.args,
    [
      [
        {
          actorId: "a-user-id",
          annotationId: "an-annotation-id",
          commentId: "a-comment-id",
        },
      ],
    ],
    "create realtime message for correct parent resource"
  );
});

test("postProcessDeleteComment: submission comment", async (t: Test) => {
  const trxStub = (sandbox().stub() as unknown) as Knex.Transaction;
  const findWithParentIdsStub = sandbox()
    .stub(CommentsDAO, "findWithParentIds")
    .resolves({
      commentId: "a-comment-id",
      approvalStepId: null,
      annotationId: null,
      submissionId: "a-submission-id",
    });
  const announceSubmissionCommentDeletionStub = sandbox()
    .stub(AnnounceSubmissionCommentService, "announceSubmissionCommentDeletion")
    .resolves();

  const result = await postProcessDeleteComment(trxStub, task);

  t.deepEqual(
    result,
    {
      type: "SUCCESS",
      message:
        "POST_PROCESS_DELETE_COMMENT task successfully completed for comment a-comment-id.",
    },
    "returns a success result"
  );

  t.deepEqual(
    findWithParentIdsStub.args,
    [[trxStub, "a-comment-id"]],
    "looks up comment's parent IDs"
  );

  t.deepEqual(
    announceSubmissionCommentDeletionStub.args,
    [
      [
        {
          actorId: "a-user-id",
          submissionId: "a-submission-id",
          commentId: "a-comment-id",
        },
      ],
    ],
    "create realtime message for correct parent resource"
  );
});
