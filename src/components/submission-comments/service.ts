import Knex from "knex";

import {
  BaseComment,
  CommentWithResources,
} from "../../components/comments/types";
import Asset from "../../components/assets/types";
import { createCommentWithAttachments } from "../../services/create-comment-with-attachments";
import { getCollaboratorsFromCommentMentions } from "../../services/add-at-mention-details";
import * as SubmissionCommentsDAO from "./dao";

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

  // TODO: will be used to announce creation to realtime
  await SubmissionCommentsDAO.create(trx, {
    submissionId,
    commentId: comment.id,
  });

  const { idNameMap: mentions } = await getCollaboratorsFromCommentMentions(
    trx,
    comment.text
  );

  return {
    ...comment,
    mentions,
  };
}
