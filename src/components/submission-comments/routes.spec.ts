import Knex from "knex";
import uuid from "node-uuid";

import { checkout } from "../../test-helpers/checkout-collection";
import createUser from "../../test-helpers/create-user";
import { generateTeamUser } from "../../test-helpers/factories/team-user";
import { Role as TeamUserRole } from "../team-users/types";
import { sandbox, db, test, Test } from "../../test-helpers/fresh";
import { authHeader, post, get } from "../../test-helpers/http";
import * as ApprovalStepSubmissionsDAO from "../approval-step-submissions/dao";
import * as AnnounceSubmissionCommentService from "../iris/messages/submission-comment";
import { CreateCommentWithAttachments } from "../comments/types";
import * as CreateNotifications from "../../services/create-notifications";

const valid: Omit<CreateCommentWithAttachments, "userId"> = {
  createdAt: new Date(),
  deletedAt: null,
  id: uuid.v4(),
  isPinned: false,
  parentCommentId: null,
  text: "This is a comment",
  attachments: [],
};

async function setup() {
  const checkedOut = await checkout();

  const submissions = await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepSubmissionsDAO.findByDesign(
      trx,
      checkedOut.collectionDesigns[0].id
    )
  );

  const announceSubmissionCommentCreationStub = sandbox()
    .stub(AnnounceSubmissionCommentService, "announceSubmissionCommentCreation")
    .resolves();

  return {
    ...checkedOut,
    submissions,
    announceSubmissionCommentCreationStub,
  };
}

test("POST /:submissionId: no session", async (t: Test) => {
  const [noAuthentication] = await post("/submission-comments/a-submission-id");

  t.equal(noAuthentication.status, 401, "returns Unauthorized status");
});

test("POST /:submissionId: cannot comment", async (t: Test) => {
  const { submissions } = await setup();
  const someoneElse = await createUser();

  const [cannotComment] = await post(
    `/submission-comments/${submissions[0].id}`,
    {
      body: {
        ...valid,
        userId: someoneElse.user.id,
      },
      headers: authHeader(someoneElse.session.id),
    }
  );

  t.equal(cannotComment.status, 403, "returns Forbidden status");
});

test("POST /:submissionId: invalid data", async (t: Test) => {
  const {
    submissions,
    user: { designer },
  } = await setup();

  const [cannotComment, body] = await post(
    `/submission-comments/${submissions[0].id}`,
    {
      body: {
        foo: "bar",
      },
      headers: authHeader(designer.session.id),
    }
  );

  t.equal(cannotComment.status, 400, "returns Invalid Data status");
  t.true(body.hasOwnProperty("message"), "Body contains a message param");
  t.true(body.hasOwnProperty("issues"), "Body contains an issues param");
});

test("End-to-end: POST -> GET", async (t: Test) => {
  const {
    submissions,
    user: { designer },
    announceSubmissionCommentCreationStub,
  } = await setup();

  const [response, body] = await post(
    `/submission-comments/${submissions[0].id}`,
    {
      body: {
        ...valid,
        userId: designer.user.id,
      },
      headers: authHeader(designer.session.id),
    }
  );

  t.equal(response.status, 201, "returns Created status");
  t.deepEqual(
    body,
    JSON.parse(
      JSON.stringify({
        ...valid,
        userId: designer.user.id,
        userEmail: designer.user.email,
        userName: designer.user.name,
        userRole: designer.user.role,
        mentions: {},
        parentCommentId: null,
        replyCount: 0,
      })
    ),
    "returns the comment in the response body"
  );
  t.deepEqual(
    announceSubmissionCommentCreationStub.args,
    [
      [
        announceSubmissionCommentCreationStub.args[0][0],
        { submissionId: submissions[0].id, commentId: body.id },
        {
          ...valid,
          userId: designer.user.id,
          userEmail: designer.user.email,
          userName: designer.user.name,
          userRole: designer.user.role,
          mentions: {},
          parentCommentId: null,
          replyCount: 0,
        },
      ],
    ],
    "creates realtime message for new comment"
  );

  const [listResponse, list] = await get(
    `/design-approval-step-submissions/${submissions[0].id}/stream-items`,
    {
      headers: authHeader(designer.session.id),
    }
  );

  t.equal(listResponse.status, 200, "returns OK status");
  t.deepEqual(
    list,
    JSON.parse(
      JSON.stringify([
        {
          ...valid,
          submissionId: submissions[0].id,
          userId: designer.user.id,
          userEmail: designer.user.email,
          userName: designer.user.name,
          userRole: designer.user.role,
          mentions: {},
          parentCommentId: null,
          replyCount: 0,
        },
      ])
    ),
    "returns created comment"
  );
});

test("POST /submission-comments/:submissionId generates notifications", async (t: Test) => {
  const notificationDesignOwnerStub = sandbox()
    .stub(
      CreateNotifications,
      "sendDesignOwnerApprovalStepSubmissionCommentCreateNotification"
    )
    .resolves();
  const notificationMentionStub = sandbox()
    .stub(
      CreateNotifications,
      "sendApprovalStepSubmissionCommentMentionNotification"
    )
    .resolves();
  const notificationReplyStub = sandbox()
    .stub(
      CreateNotifications,
      "sendApprovalStepSubmissionCommentReplyNotification"
    )
    .resolves();

  const {
    submissions,
    user: { designer },
    team,
  } = await setup();

  const { user: teamEditorUser } = await createUser();
  const teamMember = await generateTeamUser({
    userId: teamEditorUser.id,
    teamId: team.id,
    role: TeamUserRole.EDITOR,
  });

  const [response, body] = await post(
    `/submission-comments/${submissions[0].id}`,
    {
      body: {
        ...valid,
        userId: designer.user.id,
        text: `A comment @<${teamMember.teamUser.id}|teamUser>.`,
      },
      headers: authHeader(designer.session.id),
    }
  );

  t.equal(response.status, 201, "returns Created status");

  t.equal(notificationDesignOwnerStub.callCount, 1, "owner notified");
  t.deepEqual(
    notificationDesignOwnerStub.args[0].slice(1),
    [submissions[0].id, body.id, body.userId, [teamEditorUser.id], []],
    "send notification to owner with right arguments"
  );

  t.equal(notificationMentionStub.callCount, 1, "mentioned user notified");
  t.deepEqual(
    notificationMentionStub.args[0][1],
    {
      approvalSubmissionId: submissions[0].id,
      commentId: body.id,
      actorId: body.userId,
      recipientId: teamEditorUser.id,
    },
    "send notification to mentioned user"
  );

  const [replyResponse, replyBody] = await post(
    `/submission-comments/${submissions[0].id}`,
    {
      body: {
        ...valid,
        id: uuid.v4(),
        userId: designer.user.id,
        text: `A reply comment`,
        parentCommentId: body.id,
      },
      headers: authHeader(designer.session.id),
    }
  );

  t.equal(replyResponse.status, 201, "returns Created status");
  t.equal(
    notificationDesignOwnerStub.callCount,
    2,
    "owner notified about reply"
  );
  t.equal(notificationReplyStub.callCount, 1, "thread users notified");
  t.deepEqual(
    notificationReplyStub.args[0][1],
    {
      approvalSubmissionId: submissions[0].id,
      commentId: replyBody.id,
      actorId: replyBody.userId,
      recipientId: designer.user.id,
    },
    "send reply notifaction called with right args"
  );
});
