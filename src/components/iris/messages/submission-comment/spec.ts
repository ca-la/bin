import Knex from "knex";
import * as SendMessageService from "../../send-message";
import { sandbox, test, Test, db } from "../../../../test-helpers/fresh";
import {
  announceSubmissionCommentCreation,
  announceSubmissionCommentDeletion,
} from "./index";
import generateComment from "../../../../test-helpers/factories/comment";
import SubmissionsDAO from "../../../approval-step-submissions/dao";
import {
  ApprovalStepSubmission,
  ApprovalStepSubmissionArtifactType,
  ApprovalStepSubmissionState,
} from "../../../approval-step-submissions/types";

test("announceSubmissionCommentCreation supports sending a message", async (t: Test) => {
  const submission: ApprovalStepSubmission = {
    artifactType: ApprovalStepSubmissionArtifactType.TECHNICAL_DESIGN,
    createdAt: new Date(),
    collaboratorId: null,
    teamUserId: null,
    title: "A submission",
    id: "a-submission-id",
    state: ApprovalStepSubmissionState.UNSUBMITTED,
    createdBy: null,
    deletedAt: null,
    stepId: "a-step-id",
    commentCount: 1,
  };
  sandbox().stub(SubmissionsDAO, "findById").resolves(submission);
  const sendStub = sandbox()
    .stub(SendMessageService, "sendMessage")
    .resolves({});
  const { comment } = await generateComment();
  const commentWithResources = { ...comment, mentions: {}, attachments: [] };

  await db.transaction((trx: Knex.Transaction) =>
    announceSubmissionCommentCreation(
      trx,
      { submissionId: submission.id, commentId: comment.id },
      commentWithResources
    )
  );

  t.deepEqual(
    sendStub.args,
    [
      [
        {
          resource: {
            submissionId: "a-submission-id",
            comment: commentWithResources,
          },
          type: "submission-comment/created",
          channels: ["submissions/a-submission-id"],
        },
      ],
      [
        {
          resource: submission,
          type: "approval-step-submission/updated",
          channels: ["approval-steps/a-step-id", "submissions/a-submission-id"],
        },
      ],
    ],
    "calls sendMessage with the correct message"
  );
});

test("announceSubmissionCommentDeletion supports sending a message", async (t: Test) => {
  const submission: ApprovalStepSubmission = {
    artifactType: ApprovalStepSubmissionArtifactType.TECHNICAL_DESIGN,
    createdAt: new Date(),
    collaboratorId: null,
    teamUserId: null,
    title: "A submission",
    id: "a-submission-id",
    state: ApprovalStepSubmissionState.UNSUBMITTED,
    createdBy: null,
    deletedAt: null,
    stepId: "a-step-id",
    commentCount: 0,
  };
  sandbox().stub(SubmissionsDAO, "findById").resolves(submission);
  const sendStub = sandbox()
    .stub(SendMessageService, "sendMessage")
    .resolves({});

  await db.transaction((trx: Knex.Transaction) =>
    announceSubmissionCommentDeletion(trx, {
      commentId: "a-comment-id",
      submissionId: "a-submission-id",
      actorId: "a-user-id",
    })
  );

  t.deepEqual(
    sendStub.args,
    [
      [
        {
          resource: {
            commentId: "a-comment-id",
            submissionId: "a-submission-id",
            actorId: "a-user-id",
          },
          type: "submission-comment/deleted",
          channels: ["submissions/a-submission-id"],
        },
      ],
      [
        {
          resource: submission,
          type: "approval-step-submission/updated",
          channels: ["approval-steps/a-step-id", "submissions/a-submission-id"],
        },
      ],
    ],
    "calls sendMessage with the correct message"
  );
});
