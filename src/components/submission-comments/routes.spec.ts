import Knex from "knex";
import uuid from "node-uuid";

import { checkout } from "../../test-helpers/checkout-collection";
import createUser from "../../test-helpers/create-user";
import { db, test, Test } from "../../test-helpers/fresh";
import { authHeader, post, get } from "../../test-helpers/http";
import * as ApprovalStepSubmissionsDAO from "../approval-step-submissions/dao";
import { CreateCommentWithAttachments } from "../comments/types";

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

  return {
    ...checkedOut,
    submissions,
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

test("End-to-end: POST -> GET", async (t: Test) => {
  const {
    submissions,
    user: { designer },
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
