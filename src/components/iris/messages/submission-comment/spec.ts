import * as SendMessageService from "../../send-message";
import { sandbox, test, Test } from "../../../../test-helpers/fresh";
import {
  announceSubmissionCommentCreation,
  announceSubmissionCommentDeletion,
} from "./index";
import { RealtimeMessageType } from "../../types";
import generateComment from "../../../../test-helpers/factories/comment";

test("announceSubmissionCommentCreation supports sending a message", async (t: Test) => {
  const sendStub = sandbox()
    .stub(SendMessageService, "sendMessage")
    .resolves({});
  const { comment } = await generateComment();
  const commentWithResources = { ...comment, mentions: {}, attachments: [] };

  const response = await announceSubmissionCommentCreation(
    { submissionId: "a-submission-id", commentId: comment.id },
    commentWithResources
  );

  t.deepEqual(
    response,
    {
      resource: {
        submissionId: "a-submission-id",
        comment: commentWithResources,
      },
      type: RealtimeMessageType.submissionCommentCreated,
      channels: ["submissions/a-submission-id"],
    },
    "Returns the realtime message that was sent"
  );

  t.deepEqual(
    sendStub.args,
    [[response]],
    "calls sendMessage with the correct message"
  );
});

test("announceSubmissionCommentDeletion supports sending a message", async (t: Test) => {
  const sendStub = sandbox()
    .stub(SendMessageService, "sendMessage")
    .resolves({});

  const response = await announceSubmissionCommentDeletion({
    commentId: "a-comment-id",
    submissionId: "a-submission-id",
    actorId: "a-user-id",
  });

  t.deepEqual(
    response,
    {
      resource: {
        commentId: "a-comment-id",
        submissionId: "a-submission-id",
        actorId: "a-user-id",
      },
      type: RealtimeMessageType.submissionCommentDeleted,
      channels: ["submissions/a-submission-id"],
    },
    "Returns the realtime message that was sent"
  );

  t.deepEqual(
    sendStub.args,
    [[response]],
    "calls sendMessage with the correct message"
  );
});
