import { sendMessage } from "../../send-message";
import { SubmissionComment } from "../../../submission-comments/types";
import { CommentWithResources } from "../../../comments/types";
import {
  realtimeSubmissionCommentCreated,
  realtimeSubmissionCommentDeleted,
} from "../../../submission-comments/realtime";

export async function announceSubmissionCommentCreation(
  submissionComment: SubmissionComment,
  comment: CommentWithResources
): Promise<void> {
  await sendMessage(
    realtimeSubmissionCommentCreated(submissionComment.submissionId, comment)
  );
}

export async function announceSubmissionCommentDeletion({
  actorId,
  submissionId,
  commentId,
}: {
  actorId: string;
  submissionId: string;
  commentId: string;
}): Promise<void> {
  await sendMessage(
    realtimeSubmissionCommentDeleted(submissionId, actorId, commentId)
  );
}
