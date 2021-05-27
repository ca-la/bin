import Knex from "knex";
import uuid from "node-uuid";
import db from "../../services/db";
import {
  sandbox,
  // sandbox,
  test,
} from "../../test-helpers/fresh";
import { authHeader, post } from "../../test-helpers/http";
import { Test } from "tape";
import createUser from "../../test-helpers/create-user";

import { CommentInputType } from "./graphql-types";
import generateApprovalStep from "../../test-helpers/factories/design-approval-step";
import * as ApprovalStepCommentService from "../approval-step-comments/service";
import * as AnnotationCommentService from "../annotation-comments/service";
import generateAnnotation from "../../test-helpers/factories/product-design-canvas-annotation";

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
