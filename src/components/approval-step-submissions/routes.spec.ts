import Knex from "knex";
import uuid from "node-uuid";
import { authHeader, get, patch, post } from "../../test-helpers/http";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";
import { generateDesign } from "../../test-helpers/factories/product-design";
import db from "../../services/db";
import * as ApprovalStepsDAO from "../approval-steps/dao";
import {
  ApprovalStepSubmissionArtifactType,
  ApprovalStepSubmissionState,
} from "./domain-object";
import * as AnnounceCommentService from "../iris/messages/approval-step-comment";
import * as NotificationsDAO from "../notifications/dao";
import * as DesignEventsDAO from "../../dao/design-events";
import generateApprovalStep from "../../test-helpers/factories/design-approval-step";
import generateApprovalSubmission from "../../test-helpers/factories/design-approval-submission";
import generateCollaborator from "../../test-helpers/factories/collaborator";
import { NotificationType } from "../notifications/domain-object";

test("GET /design-approval-step-submissions?stepId=:stepId", async (t: Test) => {
  const designer = await createUser();
  const admin = await createUser({ role: "ADMIN" });
  const other = await createUser();

  const { approvalStep, submission } = await db.transaction(
    async (trx: Knex.Transaction) => {
      const { approvalStep: createdStep } = await generateApprovalStep(trx, {
        createdBy: designer.user.id,
      });
      const {
        submission: createdSubmission,
      } = await generateApprovalSubmission(trx, {
        stepId: createdStep.id,
      });

      return { approvalStep: createdStep, submission: createdSubmission };
    }
  );
  const [response, body] = await get(
    `/design-approval-step-submissions?stepId=${approvalStep.id}`,
    {
      headers: authHeader(designer.session.id),
    }
  );

  t.is(response.status, 200);
  t.is(body.length, 1);
  t.deepEqual(
    body,
    JSON.parse(JSON.stringify([submission])),
    "returns saved submission"
  );

  const adminRes = await get(
    `/design-approval-step-submissions?stepId=${approvalStep.id}`,
    {
      headers: authHeader(admin.session.id),
    }
  );

  t.is(adminRes[0].status, 200);
  t.is(adminRes[1].length, 1);
  t.deepEqual(
    adminRes[1],
    JSON.parse(JSON.stringify([submission])),
    "returns saved submission"
  );

  const otherRes = await get(
    `/design-approval-step-submissions?stepId=${approvalStep.id}`,
    {
      headers: authHeader(other.session.id),
    }
  );

  t.is(otherRes[0].status, 403);
});

test("PATCH /design-approval-step-submissions/:submissionId with collaboratorId", async (t: Test) => {
  const { user: user1, session: session1 } = await createUser();
  const { user: user2, session: session2 } = await createUser();
  const { user: user3 } = await createUser();

  const trx = await db.transaction();
  const { approvalStep, design } = await generateApprovalStep(trx, {
    createdBy: user1.id,
  });
  const { collaborator: collaborator1 } = await generateCollaborator(
    {
      designId: design.id,
      userId: user1.id,
    },
    trx
  );
  const { collaborator: collaborator2 } = await generateCollaborator(
    {
      designId: (await generateDesign({ userId: user2.id })).id,
      userId: user2.id,
    },
    trx
  );
  const { collaborator: collaborator3 } = await generateCollaborator(
    {
      designId: design.id,
      userId: user3.id,
    },
    trx
  );

  const { submission } = await generateApprovalSubmission(trx, {
    stepId: approvalStep.id,
  });
  await trx.commit();

  const [response, body] = await patch(
    `/design-approval-step-submissions/${submission.id}`,
    {
      headers: authHeader(session1.id),
      body: {
        collaboratorId: collaborator1.id,
      },
    }
  );
  t.is(response.status, 200);
  t.is(body.collaboratorId, collaborator1.id);

  await db.transaction(async (trx2: Knex.Transaction) => {
    const notifications = await NotificationsDAO.findByUserId(trx2, user1.id, {
      limit: 10,
      offset: 0,
    });
    t.is(notifications.length, 0);
  });
  const [response2, body2] = await patch(
    `/design-approval-step-submissions/${submission.id}`,
    {
      headers: authHeader(session1.id),
      body: {
        collaboratorId: collaborator3.id,
      },
    }
  );
  t.is(response2.status, 200);
  t.is(body2.collaboratorId, collaborator3.id);

  await db.transaction(async (trx2: Knex.Transaction) => {
    const notifications = await NotificationsDAO.findByUserId(trx2, user3.id, {
      limit: 10,
      offset: 0,
    });
    t.is(notifications.length, 1);
    t.is(notifications[0].approvalSubmissionId, submission.id);
  });

  const otherRes = await patch(
    `/design-approval-step-submissions/${submission.id}`,
    {
      headers: authHeader(session2.id),
      body: {
        collaboratorId: collaborator2.id,
      },
    }
  );

  t.is(otherRes[0].status, 403);
});

test("POST /design-approval-step-submissions?stepId=:stepId", async (t: Test) => {
  const designer = await createUser();

  const d1 = await generateDesign({ userId: designer.user.id });
  const steps = await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.findByDesign(trx, d1.id)
  );
  const [response, body] = await post(
    `/design-approval-step-submissions?stepId=${steps[1].id}`,
    {
      headers: authHeader(designer.session.id),
      body: {
        id: uuid.v4(),
        state: ApprovalStepSubmissionState.UNSUBMITTED,
        artifactType: ApprovalStepSubmissionArtifactType.CUSTOM,
        title: "Submarine",
      },
    }
  );

  t.is(response.status, 200);
  t.is(body.title, "Submarine");
  t.is(body.state, "UNSUBMITTED");
  t.is(body.stepId, steps[1].id);
});

test("POST /design-approval-step-submissions/:submissionId/approvals", async (t: Test) => {
  const { session: session1, user: actor } = await createUser({
    role: "ADMIN",
  });
  const { user: user1 } = await createUser();
  const { user: user2 } = await createUser();

  const trx = await db.transaction();
  const { approvalStep, design } = await generateApprovalStep(trx, {
    createdBy: user1.id,
  });

  const { collaborator } = await generateCollaborator(
    {
      designId: design.id,
      userId: user2.id,
    },
    trx
  );

  const { submission } = await generateApprovalSubmission(trx, {
    title: "Submarine",
    stepId: approvalStep.id,
    collaboratorId: collaborator.id,
  });
  await trx.commit();
  const [response, body] = await post(
    `/design-approval-step-submissions/${submission.id}/approvals`,
    {
      headers: authHeader(session1.id),
    }
  );
  t.is(response.status, 200);
  t.deepEqual(
    {
      designId: body.designId,
      type: body.type,
      approvalStepId: body.approvalStepId,
      approvalSubmissionId: body.approvalSubmissionId,
      submissionTitle: body.submissionTitle,
      actorId: body.actorId,
      actorName: body.actorName,
      actorRole: body.actorRole,
      actorEmail: body.actorEmail,
    },
    {
      designId: design.id,
      type: "STEP_SUMBISSION_APPROVAL",
      approvalStepId: approvalStep.id,
      approvalSubmissionId: submission.id,
      submissionTitle: "Submarine",
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "ADMIN",
      actorEmail: actor.email,
    },
    "body is approval event"
  );

  const trx2 = await db.transaction();
  try {
    const collaboratorNotifications = await NotificationsDAO.findByUserId(
      trx2,
      user2.id,
      {
        limit: 10,
        offset: 0,
      }
    );
    t.is(collaboratorNotifications.length, 1);
    t.is(collaboratorNotifications[0].approvalSubmissionId, submission.id);
    t.is(
      collaboratorNotifications[0].type,
      NotificationType.APPROVAL_STEP_SUBMISSION_APPROVAL
    );
    const designerNotifications = await NotificationsDAO.findByUserId(
      trx2,
      user1.id,
      {
        limit: 10,
        offset: 0,
      }
    );
    t.is(designerNotifications.length, 1);
    t.is(designerNotifications[0].approvalSubmissionId, submission.id);
    t.is(
      designerNotifications[0].type,
      NotificationType.APPROVAL_STEP_SUBMISSION_APPROVAL
    );
  } finally {
    await trx2.rollback();
  }

  const [failureResponse] = await post(
    `/design-approval-step-submissions/${submission.id}/approvals`,
    {
      headers: authHeader(session1.id),
    }
  );
  t.is(failureResponse.status, 409, "Could not approve twice");
});

test("POST /design-approval-step-submissions/:submissionId/revision-requests", async (t: Test) => {
  sandbox()
    .stub(AnnounceCommentService, "announceApprovalStepCommentCreation")
    .resolves({});

  const { user: collaboratorUser } = await createUser();
  const { user, session } = await createUser();

  const trx = await db.transaction();
  const { approvalStep, design } = await generateApprovalStep(trx, {
    createdBy: user.id,
  });

  const { collaborator } = await generateCollaborator(
    {
      designId: design.id,
      userId: collaboratorUser.id,
    },
    trx
  );

  const { submission } = await generateApprovalSubmission(trx, {
    title: "Fizz Buzz",
    stepId: approvalStep.id,
    state: ApprovalStepSubmissionState.SUBMITTED,
    collaboratorId: collaborator.id,
  });
  await trx.commit();

  const [response] = await post(
    `/design-approval-step-submissions/${submission.id}/revision-requests`,
    {
      headers: authHeader(session.id),
      body: {
        comment: {
          createdAt: new Date(),
          deletedAt: null,
          id: uuid.v4(),
          isPinned: false,
          parentCommentId: null,
          text: "test comment",
          userId: collaboratorUser.id,
        },
      },
    }
  );

  t.equal(response.status, 204);

  const events = await DesignEventsDAO.findByDesignId(design.id);
  t.equal(events.length, 1);
  t.equal(events[0].type, "REVISION_REQUEST");
  t.notEqual(events[0].commentId, null);

  const trx2 = await db.transaction();
  try {
    const collaboratorNotifications = await NotificationsDAO.findByUserId(
      trx2,
      collaboratorUser.id,
      {
        limit: 10,
        offset: 0,
      }
    );
    t.is(collaboratorNotifications.length, 1);
    t.is(collaboratorNotifications[0].approvalSubmissionId, submission.id);
    t.is(
      collaboratorNotifications[0].type,
      NotificationType.APPROVAL_STEP_SUBMISSION_REVISION_REQUEST
    );
  } finally {
    await trx2.rollback();
  }

  const [duplicateResponse, duplicateBody] = await post(
    `/design-approval-step-submissions/${submission.id}/revision-requests`,
    {
      headers: authHeader(session.id),
      body: {
        comment: {
          createdAt: new Date(),
          deletedAt: null,
          id: uuid.v4(),
          isPinned: false,
          parentCommentId: null,
          text: "test comment",
          userId: user.id,
        },
      },
    }
  );

  t.equal(duplicateResponse.status, 409);
  t.equal(duplicateBody.message, "Submission already has requested revisions");
});
