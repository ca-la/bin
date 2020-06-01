import Knex from "knex";
import uuid from "node-uuid";
import { authHeader, get, patch, post } from "../../test-helpers/http";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";
import db from "../../services/db";
import * as ApprovalStepsDAO from "../approval-steps/dao";
import ApprovalStepSubmission, {
  ApprovalStepSubmissionArtifactType,
  ApprovalStepSubmissionState,
} from "./domain-object";
import * as AnnounceCommentService from "../iris/messages/approval-step-comment";
import * as NotificationsDAO from "../notifications/dao";
import DesignEventsDAO from "../design-events/dao";
import generateApprovalStep from "../../test-helpers/factories/design-approval-step";
import generateApprovalSubmission from "../../test-helpers/factories/design-approval-submission";
import generateCollaborator from "../../test-helpers/factories/collaborator";
import { NotificationType } from "../notifications/domain-object";
import ApprovalStep from "../approval-steps/types";
import User from "../users/types";
import { CollaboratorWithUser } from "../collaborators/domain-objects/collaborator";
import ProductDesign from "../product-designs/domain-objects/product-design";
import Session from "../../domain-objects/session";
import { DesignEventWithMeta } from "../../published-types";

async function setupSubmission(): Promise<{
  approvalStep: ApprovalStep;
  designer: { user: User; session: Session };
  collaborator: CollaboratorWithUser;
  design: ProductDesign;
  submission: ApprovalStepSubmission;
}> {
  const designer = await createUser();
  const collab = await createUser();
  const trx = await db.transaction();
  try {
    const { approvalStep, design } = await generateApprovalStep(trx, {
      createdBy: designer.user.id,
    });

    const { collaborator } = await generateCollaborator(
      {
        designId: design.id,
        userId: collab.user.id,
      },
      trx
    );

    const { submission } = await generateApprovalSubmission(trx, {
      title: "Submarine",
      stepId: approvalStep.id,
      collaboratorId: collaborator.id,
    });

    await trx.commit();

    return {
      approvalStep,
      designer,
      collaborator,
      design,
      submission,
    };
  } catch (err) {
    await trx.rollback();
    throw err;
  }
}

test("GET /design-approval-step-submissions?stepId=:stepId", async (t: Test) => {
  const { designer, approvalStep, submission } = await setupSubmission();
  const admin = await createUser({ role: "ADMIN" });
  const other = await createUser();

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
  const { design, designer, submission } = await setupSubmission();
  const { user: user2 } = await createUser();
  const { user: user3 } = await createUser();
  const other = await createUser();

  const [
    { collaborator: collaborator2 },
    { collaborator: collaborator3 },
  ] = await db.transaction(async (trx: Knex.Transaction) => [
    await generateCollaborator(
      {
        designId: design.id,
        userId: user2.id,
      },
      trx
    ),
    await generateCollaborator(
      {
        designId: design.id,
        userId: user3.id,
      },
      trx
    ),
  ]);

  const [response, body] = await patch(
    `/design-approval-step-submissions/${submission.id}`,
    {
      headers: authHeader(designer.session.id),
      body: {
        collaboratorId: collaborator2.id,
      },
    }
  );
  t.is(response.status, 200);
  t.is(body.collaboratorId, collaborator2.id);

  const [response2, body2] = await patch(
    `/design-approval-step-submissions/${submission.id}`,
    {
      headers: authHeader(designer.session.id),
      body: {
        collaboratorId: collaborator3.id,
      },
    }
  );
  t.is(response2.status, 200);
  t.is(body2.collaboratorId, collaborator3.id);

  const events = await db.transaction(async (trx: Knex.Transaction) =>
    DesignEventsDAO.findApprovalStepEvents(trx, design.id, submission.stepId)
  );

  const assignmentEvent = events.find(
    (e: DesignEventWithMeta) => e.type === "STEP_SUMBISSION_ASSIGNMENT"
  );
  if (!assignmentEvent) {
    return t.fail("Could not find design event for review assignment");
  }
  t.is(
    assignmentEvent.approvalSubmissionId,
    submission.id,
    "Submission event has an approvalSubmissionId"
  );
  await db.transaction(async (trx: Knex.Transaction) => {
    const notifications = await NotificationsDAO.findByUserId(trx, user3.id, {
      limit: 10,
      offset: 0,
    });
    t.is(notifications.length, 1);
    t.is(notifications[0].approvalSubmissionId, submission.id);
  });

  const otherRes = await patch(
    `/design-approval-step-submissions/${submission.id}`,
    {
      headers: authHeader(other.session.id),
      body: {
        collaboratorId: collaborator2.id,
      },
    }
  );

  t.is(otherRes[0].status, 403);
});

test("POST /design-approval-step-submissions?stepId=:stepId", async (t: Test) => {
  const { design, designer } = await setupSubmission();
  const steps = await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.findByDesign(trx, design.id)
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
  const {
    approvalStep,
    design,
    designer,
    collaborator,
    submission,
  } = await setupSubmission();
  const [response, body] = await post(
    `/design-approval-step-submissions/${submission.id}/approvals`,
    {
      headers: authHeader(designer.session.id),
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
      actorId: designer.user.id,
      actorName: designer.user.name,
      actorRole: "USER",
      actorEmail: designer.user.email,
    },
    "body is approval event"
  );

  const [failureResponse] = await post(
    `/design-approval-step-submissions/${submission.id}/approvals`,
    {
      headers: authHeader(designer.session.id),
    }
  );
  t.is(failureResponse.status, 409, "Could not approve twice");

  await db.transaction(async (trx: Knex.Transaction) => {
    const collaboratorNotifications = await NotificationsDAO.findByUserId(
      trx,
      collaborator.userId!,
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
      trx,
      designer.user.id,
      {
        limit: 10,
        offset: 0,
      }
    );
    t.is(
      designerNotifications.length,
      0,
      "does not send a notification to the actor"
    );
  });
});

test("POST /design-approval-step-submissions/:submissionId/revision-requests", async (t: Test) => {
  sandbox()
    .stub(AnnounceCommentService, "announceApprovalStepCommentCreation")
    .resolves({});

  const {
    design,
    designer,
    collaborator,
    submission,
  } = await setupSubmission();

  const [response] = await post(
    `/design-approval-step-submissions/${submission.id}/revision-requests`,
    {
      headers: authHeader(designer.session.id),
      body: {
        comment: {
          createdAt: new Date(),
          deletedAt: null,
          id: uuid.v4(),
          isPinned: false,
          parentCommentId: null,
          text: "test comment",
          userId: collaborator.userId,
        },
      },
    }
  );

  t.equal(response.status, 204);

  const trx = await db.transaction();
  try {
    const events = await DesignEventsDAO.find(trx, { designId: design.id });
    t.equal(events.length, 1);
    t.equal(events[0].type, "REVISION_REQUEST");
    t.notEqual(events[0].commentId, null);

    const collaboratorNotifications = await NotificationsDAO.findByUserId(
      trx,
      collaborator.userId!,
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
    await trx.rollback();
  }

  const [duplicateResponse, duplicateBody] = await post(
    `/design-approval-step-submissions/${submission.id}/revision-requests`,
    {
      headers: authHeader(designer.session.id),
      body: {
        comment: {
          createdAt: new Date(),
          deletedAt: null,
          id: uuid.v4(),
          isPinned: false,
          parentCommentId: null,
          text: "test comment",
          userId: designer.user.id,
        },
      },
    }
  );

  t.equal(duplicateResponse.status, 409);
  t.equal(duplicateBody.message, "Submission already has requested revisions");
});
