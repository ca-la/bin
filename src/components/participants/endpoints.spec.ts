import Knex from "knex";
import uuid from "node-uuid";
import db from "../../services/db";
import { sandbox, test } from "../../test-helpers/fresh";
import { authHeader, post } from "../../test-helpers/http";
import { Test } from "tape";
import createUser from "../../test-helpers/create-user";

import { GetParticipantsArgs } from "./endpoints";
import generateApprovalStep from "../../test-helpers/factories/design-approval-step";
import generateAnnotation from "../../test-helpers/factories/product-design-canvas-annotation";
import * as ParticipantsDAO from "./dao";

test("getParticipants", async (t: Test) => {
  async function sendRequest(
    variables: GetParticipantsArgs,
    headers: Record<string, string>
  ) {
    return post("/v2", {
      body: {
        operationName: "n",
        query: `query n($designId: String, $approvalStepId: String, $annotationId: String) {
        getParticipants(designId: $designId, approvalStepId: $approvalStepId, annotationId: $annotationId) {
          id
        }
      }`,
        variables,
      },
      headers,
    });
  }

  const { user, session } = await createUser({ role: "USER" });
  const { session: anotherSession } = await createUser({ role: "USER" });
  const { annotation, approvalStep, design } = await db.transaction(
    async (trx: Knex.Transaction) => {
      const {
        annotation: annotationLocal,
        design: designLocal,
      } = await generateAnnotation({
        createdBy: user.id,
      });
      const { approvalStep: approvalStepLocal } = await generateApprovalStep(
        trx,
        {
          createdBy: user.id,
          designId: designLocal.id,
        }
      );
      return {
        approvalStep: approvalStepLocal,
        annotation: annotationLocal,
        design: designLocal,
      };
    }
  );

  const [, notFoundBody] = await sendRequest(
    {
      designId: null,
      annotationId: null,
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
      designId: null,
      annotationId: null,
      approvalStepId: approvalStep.id,
    },
    authHeader(anotherSession.id)
  );
  t.is(
    forbiddenBody.errors[0].extensions.code,
    "FORBIDDEN",
    "Should throw FORBIDDEN for arbitrary user"
  );

  const [, badInputBody] = await sendRequest(
    {
      designId: null,
      annotationId: null,
      approvalStepId: null,
    },
    authHeader(session.id)
  );
  t.is(
    badInputBody.errors[0].extensions.code,
    "BAD_USER_INPUT",
    "Should throw BAD_USER_INPUT if no approvalStepId / annotationId / designId is provided"
  );

  const findByDesignStub = sandbox()
    .stub(ParticipantsDAO, "findByDesign")
    .resolves([]);

  // via approvalStepId
  const [, withApprovalStepBody] = await sendRequest(
    {
      designId: null,
      annotationId: null,
      approvalStepId: approvalStep.id,
    },
    authHeader(session.id)
  );
  t.deepEqual(
    withApprovalStepBody.data,
    { getParticipants: [] },
    "Should return ParticipantsDAO.findByDesign result"
  );
  t.is(
    findByDesignStub.args[0][1],
    design.id,
    "Should call ParticipantsDAO.findByDesign with approvalStep.designId"
  );
  t.is(findByDesignStub.args.length, 1);
  findByDesignStub.reset();

  // via annotationId
  await sendRequest(
    {
      designId: null,
      annotationId: annotation.id,
      approvalStepId: null,
    },
    authHeader(session.id)
  );
  t.is(
    findByDesignStub.args[0][1],
    design.id,
    "Should call ParticipantsDAO.findByDesign with annotation designId"
  );
  t.is(findByDesignStub.args.length, 1);
  findByDesignStub.reset();

  // via designId
  await sendRequest(
    {
      designId: design.id,
      annotationId: null,
      approvalStepId: null,
    },
    authHeader(session.id)
  );
  t.is(
    findByDesignStub.args[0][1],
    design.id,
    "Should call ParticipantsDAO.findByDesign with designId"
  );
  t.is(findByDesignStub.args.length, 1);
  findByDesignStub.reset();
});
