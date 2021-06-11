import Knex from "knex";
import uuid from "node-uuid";
import db from "../../services/db";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import { authHeader, post } from "../../test-helpers/http";
import createUser from "../../test-helpers/create-user";

import { CommentInputType } from "./graphql-types";
import generateApprovalStep from "../../test-helpers/factories/design-approval-step";
import * as ApprovalStepCommentService from "../approval-step-comments/service";
import * as AnnotationCommentService from "../annotation-comments/service";
import generateAnnotation from "../../test-helpers/factories/product-design-canvas-annotation";
import * as AnnotationCommentsDAO from "../annotation-comments/dao";
import * as CommentsDAO from "../comments/dao";
import * as CursorService from "../comments/cursor-service";
import { omit } from "lodash";
import generateCanvas from "../../test-helpers/factories/product-design-canvas";
import { generateAnnotationComment } from "../../test-helpers/factories/annotation-comment";
import * as GetPermissionsService from "../../services/get-permissions";

test("createComment", async (t: Test) => {
  async function sendRequest(
    comment: Partial<CommentInputType>,
    headers: Record<string, string>
  ) {
    return post("/v2", {
      body: {
        operationName: "n",
        query: `mutation n($comment: CommentInput!) {
        createComment(comment: $comment) {
          id
        }
      }`,
        variables: {
          comment: {
            text: "hey",
            parentCommentId: null,
            isPinned: false,
            approvalStepId: null,
            annotationId: null,
            ...comment,
          },
        },
      },
      headers,
    });
  }

  const { user, session } = await createUser({ role: "USER" });
  const { session: anotherSession } = await createUser({ role: "USER" });
  const { annotation, approvalStep } = await db.transaction(
    async (trx: Knex.Transaction) => {
      const { annotation: annotationLocal, design } = await generateAnnotation({
        createdBy: user.id,
      });
      const { approvalStep: approvalStepLocal } = await generateApprovalStep(
        trx,
        {
          createdBy: user.id,
          designId: design.id,
        }
      );
      return { approvalStep: approvalStepLocal, annotation: annotationLocal };
    }
  );

  const [, notFoundBody] = await sendRequest(
    {
      approvalStepId: uuid.v4(),
    },
    authHeader(session.id)
  );
  t.is(
    notFoundBody.errors[0].extensions.code,
    "NOT_FOUND",
    "Should throw NOT_FOUND if approval step id is wrong"
  );

  const [, forbiddenBody] = await sendRequest(
    {
      approvalStepId: approvalStep.id,
    },
    authHeader(anotherSession.id)
  );
  t.is(
    forbiddenBody.errors[0].extensions.code,
    "FORBIDDEN",
    "Should throw FORBIDDEN for arbitrary user"
  );

  const [, badInputBody] = await sendRequest({}, authHeader(session.id));
  t.is(
    badInputBody.errors[0].extensions.code,
    "BAD_USER_INPUT",
    "Should throw BAD_USER_INPUT if no approvalStepId or annotationId is provided"
  );

  sandbox().stub(ApprovalStepCommentService, "createAndAnnounce").resolves({
    id: "withApprovalStepId",
  });
  const [, withApprovalStepBody] = await sendRequest(
    {
      approvalStepId: approvalStep.id,
    },
    authHeader(session.id)
  );
  t.is(
    withApprovalStepBody.data.createComment.id,
    "withApprovalStepId",
    "Should create a comment and return result of ApprovalStepCommentService.createAndAnnounce"
  );

  sandbox().stub(AnnotationCommentService, "createAndAnnounce").resolves({
    id: "withAnnotationId",
  });
  const [, withAnnotationBody] = await sendRequest(
    {
      annotationId: annotation.id,
    },
    authHeader(session.id)
  );
  t.is(
    withAnnotationBody.data.createComment.id,
    "withAnnotationId",
    "Should create a comment and return result of AnnotationCommentService.createAndAnnounce"
  );
});

function setup() {
  return {
    findByIdStub: sandbox()
      .stub(AnnotationCommentsDAO, "findByAnnotationId")
      .resolves([]),
    getPermissionsStub: sandbox()
      .stub(GetPermissionsService, "getDesignPermissions")
      .resolves({ canView: true }),
    getDesignIdStub: sandbox()
      .stub(CommentsDAO, "extractDesignIdFromCommentParent")
      .resolves("design-id"),
  };
}

test("comments endpoint", async () => {
  function buildRequest(
    options: {
      annotationId?: string;
      parentCommentId?: string | null;
      previousCursor?: string | null;
      nextCursor?: string | null;
      commentId?: string | null;
      limit?: number;
    } = {
      annotationId: "annotation-id",
      parentCommentId: null,
      previousCursor: null,
      nextCursor: null,
      commentId: null,
      limit: 10,
    }
  ) {
    return {
      operationName: "comments",
      query: `
      query comments(
        $annotationId: String!,
        $parentCommentId: String,
        $limit: Int!,
        $nextCursor: String,
        $previousCursor: String,
        $commentId: String) {
          comments(
            annotationId: $annotationId,
            parentCommentId: $parentCommentId,
            limit: $limit,
            nextCursor: $nextCursor,
            previousCursor: $previousCursor
            commentId: $commentId
          ) {
          data {
            id
            createdAt
            replyCount
          }
          nextCursor
          previousCursor
        }
      }`,
      variables: options,
    };
  }

  test("Requires authentication", async (t: Test) => {
    const [response, body] = await post("/v2", {
      body: buildRequest({
        annotationId: "annotation-id",
        previousCursor: null,
        nextCursor: null,
        limit: 10,
      }),
    });
    t.equal(response.status, 200);
    t.equal(body.errors[0].message, "Unauthorized");
  });

  test("Fails on negative limit", async (t: Test) => {
    setup();
    const { session } = await createUser({ role: "USER" });
    const [response, body] = await post("/v2", {
      body: buildRequest({
        annotationId: "annotation-id",
        previousCursor: null,
        nextCursor: null,
        limit: -10,
      }),
      headers: authHeader(session.id),
    });
    t.equal(response.status, 200);
    t.equal(body.errors[0].message, "Limit cannot be negative!");
  });

  test("Fails on invalid cursor", async (t: Test) => {
    setup();
    const { session } = await createUser({ role: "USER" });
    const [responsePrev, bodyPrev] = await post("/v2", {
      body: buildRequest({
        annotationId: "annotation-id",
        nextCursor: null,
        previousCursor: "not a valid cursor",
        limit: 10,
      }),
      headers: authHeader(session.id),
    });
    t.equal(responsePrev.status, 200);
    t.equal(bodyPrev.errors[0].message, "Invalid cursor");

    const [responseNext, bodyNext] = await post("/v2", {
      body: buildRequest({
        annotationId: "annotation-id",
        nextCursor: "not a valid cursor",
        previousCursor: null,
        limit: 10,
      }),
      headers: authHeader(session.id),
    });
    t.equal(responseNext.status, 200);
    t.equal(bodyNext.errors[0].message, "Invalid cursor");
  });

  test("Valid request for previous page", async (t: Test) => {
    const { findByIdStub } = setup();
    const { session } = await createUser({ role: "USER" });
    const limit = 10;
    const [response, body] = await post("/v2", {
      body: buildRequest({
        annotationId: "annotation-id",
        nextCursor: null,
        previousCursor: CursorService.createCursor({
          createdAt: new Date(2020, 0, 1),
          id: "a-comment-id",
        }),
        limit,
      }),
      headers: authHeader(session.id),
    });

    t.deepEqual(omit(findByIdStub.args[0][1], "modify"), {
      annotationId: "annotation-id",
      limit: limit + 1,
      sortOrder: "desc",
    });
    t.equal(response.status, 200);
    t.deepEquals(body, {
      data: {
        comments: {
          data: [],
          previousCursor: null,
          nextCursor: CursorService.createCursor({
            createdAt: new Date(2020, 0, 1),
            id: "a-comment-id",
          }),
        },
      },
    });
  });

  test("Valid request for next page", async (t: Test) => {
    const { findByIdStub } = setup();
    const { session } = await createUser({ role: "USER" });
    const limit = 10;
    const [response, body] = await post("/v2", {
      body: buildRequest({
        annotationId: "annotation-id",
        previousCursor: null,
        nextCursor: CursorService.createCursor({
          createdAt: new Date(2020, 0, 1),
          id: "a-comment-id",
        }),
        limit,
      }),
      headers: authHeader(session.id),
    });

    t.deepEqual(omit(findByIdStub.args[0][1], "modify"), {
      annotationId: "annotation-id",
      limit: limit + 2,
      sortOrder: "asc",
    });
    t.equal(response.status, 200);
    t.deepEquals(body, {
      data: {
        comments: {
          data: [],
          previousCursor: CursorService.createCursor({
            createdAt: new Date(2020, 0, 1),
            id: "a-comment-id",
          }),
          nextCursor: null,
        },
      },
    });
  });

  test("Valid request for page without cursors", async (t: Test) => {
    const { findByIdStub } = setup();
    const { session } = await createUser({ role: "USER" });
    const limit = 10;
    const [response, body] = await post("/v2", {
      body: buildRequest({
        annotationId: "annotation-id",
        previousCursor: null,
        nextCursor: null,
        limit,
      }),
      headers: authHeader(session.id),
    });

    t.deepEqual(omit(findByIdStub.args[0][1], "modify"), {
      annotationId: "annotation-id",
      limit: limit + 1,
      sortOrder: "desc",
    });
    t.equal(response.status, 200);
    t.deepEquals(body, {
      data: {
        comments: {
          data: [],
          previousCursor: null,
          nextCursor: null,
        },
      },
    });
  });

  test("End to end test", async (t: Test) => {
    const { session, user } = await createUser({ role: "USER" });
    const { session: unauthorizedUser } = await createUser({
      role: "USER",
    });
    const { canvas } = await generateCanvas({ createdBy: user.id });
    const { annotation } = await generateAnnotation({
      canvasId: canvas.id,
      createdBy: user.id,
    });
    const { comment: comment1 } = await generateAnnotationComment({
      annotationId: annotation.id,
      comment: { createdAt: new Date(2020, 0, 1) },
    });
    const { comment: replyComment1 } = await generateAnnotationComment({
      annotationId: annotation.id,
      comment: {
        createdAt: new Date(2020, 0, 2),
        parentCommentId: comment1.id,
      },
    });
    await generateAnnotationComment({
      annotationId: annotation.id,
      comment: {
        createdAt: new Date(2020, 0, 3),
        deletedAt: new Date(),
      },
    });
    const { comment: comment2 } = await generateAnnotationComment({
      annotationId: annotation.id,
      comment: { createdAt: new Date(2020, 0, 4) },
    });
    const { comment: replyComment2 } = await generateAnnotationComment({
      annotationId: annotation.id,
      comment: {
        createdAt: new Date(2020, 0, 5),
        parentCommentId: comment1.id,
      },
    });
    const { comment: replyComment3 } = await generateAnnotationComment({
      annotationId: annotation.id,
      comment: {
        createdAt: new Date(2020, 0, 6),
        parentCommentId: comment1.id,
      },
    });
    const { comment: comment3 } = await generateAnnotationComment({
      annotationId: annotation.id,
      comment: { createdAt: new Date(2020, 0, 7) },
    });
    const { comment: comment4 } = await generateAnnotationComment({
      annotationId: annotation.id,
      comment: { createdAt: new Date(2020, 0, 8) },
    });

    const previousCursor = CursorService.createCursor({
      createdAt: comment2.createdAt,
      id: comment2.id,
    });

    const [unauthorizedResponse, unauthorizedBody] = await post("/v2", {
      body: buildRequest({
        annotationId: annotation.id,
        previousCursor: null,
        nextCursor: null,
        limit: 2,
      }),
      headers: authHeader(unauthorizedUser.id),
    });
    t.equal(unauthorizedResponse.status, 200);

    t.equal(
      unauthorizedBody.errors[0].message,
      "Not authorized to view comments on this design",
      "Design access is required"
    );

    const [firstPageResponse, firstPageBody] = await post("/v2", {
      body: buildRequest({
        annotationId: annotation.id,
        previousCursor: null,
        nextCursor: null,
        limit: 2,
      }),
      headers: authHeader(session.id),
    });

    t.equal(firstPageResponse.status, 200);
    t.deepEquals(
      firstPageBody,
      {
        data: {
          comments: {
            data: [
              {
                id: comment3.id,
                createdAt: comment3.createdAt.toISOString(),
                replyCount: 0,
              },
              {
                id: comment4.id,
                createdAt: comment4.createdAt.toISOString(),
                replyCount: 0,
              },
            ],
            previousCursor,
            nextCursor: null,
          },
        },
      },
      "returns newest comments"
    );

    const [secondPageResponse, secondPageBody] = await post("/v2", {
      body: buildRequest({
        annotationId: annotation.id,
        previousCursor,
        nextCursor: null,
        limit: 2,
      }),
      headers: authHeader(session.id),
    });

    t.equal(secondPageResponse.status, 200);
    t.deepEquals(
      secondPageBody,
      {
        data: {
          comments: {
            data: [
              {
                id: comment1.id,
                createdAt: comment1.createdAt.toISOString(),
                replyCount: 3,
              },
              {
                id: comment2.id,
                createdAt: comment2.createdAt.toISOString(),
                replyCount: 0,
              },
            ],
            previousCursor: null,
            nextCursor: previousCursor,
          },
        },
      },
      "returns previous page of comment"
    );

    const [replyPageResponse, replyPageBody] = await post("/v2", {
      body: buildRequest({
        annotationId: annotation.id,
        parentCommentId: comment1.id,
        previousCursor: null,
        nextCursor: null,
        limit: 2,
      }),
      headers: authHeader(session.id),
    });

    t.equal(replyPageResponse.status, 200);
    t.deepEquals(
      replyPageBody,
      {
        data: {
          comments: {
            data: [
              {
                id: replyComment2.id,
                createdAt: replyComment2.createdAt.toISOString(),
                replyCount: 0,
              },
              {
                id: replyComment3.id,
                createdAt: replyComment3.createdAt.toISOString(),
                replyCount: 0,
              },
            ],
            previousCursor: CursorService.createCursor({
              id: replyComment1.id,
              createdAt: replyComment1.createdAt,
            }),
            nextCursor: null,
          },
        },
      },
      "returns comments with a given parent id"
    );

    const [byCommentIdResponse, byCommentIdBody] = await post("/v2", {
      body: buildRequest({
        annotationId: annotation.id,
        parentCommentId: null,
        previousCursor: null,
        nextCursor: null,
        commentId: comment3.id,
        limit: 2,
      }),
      headers: authHeader(session.id),
    });

    t.equal(byCommentIdResponse.status, 200);
    t.deepEquals(
      byCommentIdBody,
      {
        data: {
          comments: {
            data: [
              {
                id: comment2.id,
                createdAt: comment2.createdAt.toISOString(),
                replyCount: 0,
              },
              {
                id: comment3.id,
                createdAt: comment3.createdAt.toISOString(),
                replyCount: 0,
              },
            ],
            previousCursor: CursorService.createCursor({
              id: comment1.id,
              createdAt: comment1.createdAt,
            }),
            nextCursor: CursorService.createCursor({
              id: comment3.id,
              createdAt: comment3.createdAt,
            }),
          },
        },
      },
      "returns comments with a given comment id"
    );

    const [byReplyCommentIdResponse, byReplyCommentIdBody] = await post("/v2", {
      body: buildRequest({
        annotationId: annotation.id,
        parentCommentId: comment1.id,
        previousCursor: null,
        nextCursor: null,
        commentId: replyComment2.id,
        limit: 2,
      }),
      headers: authHeader(session.id),
    });

    t.equal(byReplyCommentIdResponse.status, 200);
    t.deepEquals(
      byReplyCommentIdBody,
      {
        data: {
          comments: {
            data: [
              {
                id: replyComment1.id,
                createdAt: replyComment1.createdAt.toISOString(),
                replyCount: 0,
              },
              {
                id: replyComment2.id,
                createdAt: replyComment2.createdAt.toISOString(),
                replyCount: 0,
              },
            ],
            previousCursor: null,
            nextCursor: CursorService.createCursor({
              id: replyComment2.id,
              createdAt: replyComment2.createdAt,
            }),
          },
        },
      },
      "returns comments with a given reply comment id"
    );
  });
});
