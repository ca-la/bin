import Knex from "knex";

import {
  BaseComment,
  CommentWithResources,
} from "../../components/comments/types";
import Asset from "../../components/assets/types";
import { createCommentWithAttachments } from "../../services/create-comment-with-attachments";
import { getCollaboratorsFromCommentMentions } from "../../services/add-at-mention-details";
import * as SubmissionCommentsDAO from "./dao";
import { announceSubmissionCommentCreation } from "../iris/messages/submission-comment";

interface CreateSubmissionCommentOptions {
  comment: BaseComment;
  attachments: Asset[];
  userId: string;
  submissionId: string;
}

// TODO: add the "announce" part
export async function createAndAnnounce(
  trx: Knex.Transaction,
  options: CreateSubmissionCommentOptions
): Promise<CommentWithResources> {
  const { submissionId, ...baseOptions } = options;

  const comment = await createCommentWithAttachments(trx, baseOptions);

  const { idNameMap: mentions } = await getCollaboratorsFromCommentMentions(
    trx,
    comment.text
  );

  const commentWithResources = {
    ...comment,
    mentions,
  };

  const submissionComment = await SubmissionCommentsDAO.create(trx, {
    submissionId,
    commentId: comment.id,
  });

  await announceSubmissionCommentCreation(
    submissionComment,
    commentWithResources
  );

  return commentWithResources;
}
