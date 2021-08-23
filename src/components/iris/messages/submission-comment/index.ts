import Knex from "knex";

import { sendMessage } from "../../send-message";
import { SubmissionComment } from "../../../submission-comments/types";
import { CommentWithResources } from "../../../comments/types";
import {
  realtimeSubmissionCommentCreated,
  realtimeSubmissionCommentDeleted,
} from "../../../submission-comments/realtime";
import { realtimeApprovalSubmissionUpdated } from "../../../approval-step-submissions/realtime";
import SubmissionsDAO from "../../../approval-step-submissions/dao";

export async function announceSubmissionCommentCreation(
  trx: Knex.Transaction,
  submissionComment: SubmissionComment,
  comment: CommentWithResources
): Promise<void> {
  await sendMessage(
    realtimeSubmissionCommentCreated(submissionComment.submissionId, comment)
  );

  const submission = await SubmissionsDAO.findById(
    trx,
    submissionComment.submissionId
  );

  if (submission) {
    await sendMessage(realtimeApprovalSubmissionUpdated(submission));
  }
}

export async function announceSubmissionCommentDeletion(
  trx: Knex.Transaction,
  {
    actorId,
    submissionId,
    commentId,
  }: {
    actorId: string;
    submissionId: string;
    commentId: string;
  }
): Promise<void> {
  await sendMessage(
    realtimeSubmissionCommentDeleted(submissionId, actorId, commentId)
  );

  const submission = await SubmissionsDAO.findById(trx, submissionId);

  if (submission) {
    await sendMessage(realtimeApprovalSubmissionUpdated(submission));
  }
}
