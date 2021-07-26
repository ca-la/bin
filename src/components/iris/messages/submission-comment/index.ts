import { sendMessage } from "../../send-message";
import { RealtimeMessage, RealtimeMessageType } from "../../types";
import { buildChannelName } from "../../build-channel";
import { SubmissionComment } from "../../../submission-comments/types";
import { CommentWithResources } from "../../../comments/types";

export async function announceSubmissionCommentCreation(
  submissionComment: SubmissionComment,
  comment: CommentWithResources
): Promise<RealtimeMessage> {
  const { submissionId } = submissionComment;
  const message: RealtimeMessage = {
    channels: [buildChannelName("submissions", submissionId)],
    resource: {
      comment,
      submissionId,
    },
    type: RealtimeMessageType.submissionCommentCreated,
  };

  await sendMessage(message);

  return message;
}

export async function announceSubmissionCommentDeletion({
  actorId,
  submissionId,
  commentId,
}: {
  actorId: string;
  submissionId: string;
  commentId: string;
}): Promise<RealtimeMessage> {
  const message: RealtimeMessage = {
    channels: [buildChannelName("submissions", submissionId)],
    resource: { commentId, submissionId, actorId },
    type: RealtimeMessageType.submissionCommentDeleted,
  };

  await sendMessage(message);

  return message;
}
