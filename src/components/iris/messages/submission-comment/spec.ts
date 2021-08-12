import * as SendMessageService from "../../send-message";
import { sandbox, test, Test } from "../../../../test-helpers/fresh";
import {
  announceSubmissionCommentCreation,
  announceSubmissionCommentDeletion,
} from "./index";
import generateComment from "../../../../test-helpers/factories/comment";

test("announceSubmissionCommentCreation supports sending a message", async (t: Test) => {
  const sendStub = sandbox()
    .stub(SendMessageService, "sendMessage")
    .resolves({});
  const { comment } = await generateComment();
  const commentWithResources = { ...comment, mentions: {}, attachments: [] };

  await announceSubmissionCommentCreation(
    { submissionId: "a-submission-id", commentId: comment.id },
    commentWithResources
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
    ],
    "calls sendMessage with the correct message"
  );
});

test("announceSubmissionCommentDeletion supports sending a message", async (t: Test) => {
  const sendStub = sandbox()
    .stub(SendMessageService, "sendMessage")
    .resolves({});

  await announceSubmissionCommentDeletion({
    commentId: "a-comment-id",
    submissionId: "a-submission-id",
    actorId: "a-user-id",
  });

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
    ],
    "calls sendMessage with the correct message"
  );
});
