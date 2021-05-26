import { sandbox, test, Test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";
import { authHeader, post } from "../../test-helpers/http";
import * as AnnotationCommentsDAO from "../annotation-comments/dao";
import * as CursorService from "../comments/cursor-service";
import { omit } from "lodash";
import generateCanvas from "../../test-helpers/factories/product-design-canvas";
import generateAnnotation from "../../test-helpers/factories/product-design-canvas-annotation";
import { generateAnnotationComment } from "../../test-helpers/factories/annotation-comment";

function setup() {
  return {
    findByIdStub: sandbox()
      .stub(AnnotationCommentsDAO, "findByAnnotationId")
      .resolves([]),
  };
}

test("notificationMessages endpoint", async () => {
  function buildRequest(
    options: {
      annotationId?: string;
      parentCommentId?: string | null;
      previousCursor?: string | null;
      nextCursor?: string | null;
      limit?: number;
    } = {
      annotationId: "annotation-id",
      parentCommentId: null,
      previousCursor: null,
      nextCursor: null,
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
        $previousCursor: String) {
          annotationComments(
            annotationId: $annotationId,
            parentCommentId: $parentCommentId,
            limit: $limit,
            nextCursor: $nextCursor,
            previousCursor: $previousCursor
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
        annotationComments: {
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
        annotationComments: {
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
        annotationComments: {
          data: [],
          previousCursor: null,
          nextCursor: null,
        },
      },
    });
  });

  test("End to end test", async (t: Test) => {
    const { session, user } = await createUser({ role: "USER" });
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
    const { comment: comment3 } = await generateAnnotationComment({
      annotationId: annotation.id,
      comment: { createdAt: new Date(2020, 0, 6) },
    });

    const previousCursor = CursorService.createCursor({
      createdAt: comment1.createdAt,
      id: comment1.id,
    });

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
          annotationComments: {
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
          annotationComments: {
            data: [
              {
                id: comment1.id,
                createdAt: comment1.createdAt.toISOString(),
                replyCount: 2,
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
          annotationComments: {
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
            nextCursor: null,
          },
        },
      },
      "returns comments with a given parent id"
    );
  });
});
