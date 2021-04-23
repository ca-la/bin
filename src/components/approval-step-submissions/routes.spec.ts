import Knex from "knex";
import uuid from "node-uuid";
import { omit } from "lodash";

import { authHeader, get, patch, post, del } from "../../test-helpers/http";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";
import db from "../../services/db";
import * as ApprovalStepsDAO from "../approval-steps/dao";
import ApprovalStepSubmission, {
  ApprovalStepSubmissionArtifactType,
  ApprovalStepSubmissionState,
} from "./types";
import * as NotificationsDAO from "../notifications/dao";
import DesignEventsDAO from "../design-events/dao";
import generateApprovalStep from "../../test-helpers/factories/design-approval-step";
import generateApprovalSubmission from "../../test-helpers/factories/design-approval-submission";
import generateCollaborator from "../../test-helpers/factories/collaborator";
import generateCollection from "../../test-helpers/factories/collection";
import { moveDesign } from "../../test-helpers/collections";
import { NotificationType } from "../notifications/domain-object";
import ApprovalStep from "../approval-steps/types";
import User from "../users/types";
import { CollaboratorWithUser } from "../../components/collaborators/types";
import ProductDesign from "../product-designs/domain-objects/product-design";
import Session from "../../domain-objects/session";
import SessionsDAO from "../../dao/sessions";
import { DesignEventWithMeta } from "../../published-types";
import * as NotificationService from "../../services/create-notifications";
import * as IrisService from "../iris/send-message";
import { templateDesignEventWithMeta } from "../design-events/types";
import { generateTeam } from "../../test-helpers/factories/team";
import { generateTeamUser } from "../../test-helpers/factories/team-user";
import { Role as TeamUserRole } from "../team-users/types";

async function setupSubmission(
  approvalSubmission: Partial<ApprovalStepSubmission> = {}
): Promise<{
  approvalStep: ApprovalStep;
  designer: { user: User; session: Session };
  collaborator: CollaboratorWithUser;
  collaboratorSession: Session;
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
      ...approvalSubmission,
    });

    await trx.commit();

    return {
      approvalStep,
      designer,
      collaborator,
      collaboratorSession: collab.session,
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
    (e: DesignEventWithMeta) => e.type === "STEP_SUBMISSION_ASSIGNMENT"
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

test("PATCH /design-approval-step-submissions/:submissionId with teamUserId", async (t: Test) => {
  const { design, designer, submission } = await setupSubmission();
  const { user: user2 } = await createUser();
  const { user: user3 } = await createUser();
  const other = await createUser();

  const { teamUser: teamUser2 } = await generateTeam(user2.id);
  const { teamUser: teamUser3 } = await generateTeam(user3.id);

  const [response, body] = await patch(
    `/design-approval-step-submissions/${submission.id}`,
    {
      headers: authHeader(designer.session.id),
      body: {
        teamUserId: teamUser2.id,
      },
    }
  );
  t.is(response.status, 200);
  t.is(body.teamUserId, teamUser2.id);

  const [response2, body2] = await patch(
    `/design-approval-step-submissions/${submission.id}`,
    {
      headers: authHeader(designer.session.id),
      body: {
        teamUserId: teamUser3.id,
      },
    }
  );
  t.is(response2.status, 200);
  t.is(body2.teamUserId, teamUser3.id);

  const events = await db.transaction(async (trx: Knex.Transaction) =>
    DesignEventsDAO.findApprovalStepEvents(trx, design.id, submission.stepId)
  );

  const assignmentEvent = events.find(
    (e: DesignEventWithMeta) => e.type === "STEP_SUBMISSION_ASSIGNMENT"
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
        teamUserId: teamUser2.id,
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
  t.is(body.createdBy, designer.user.id, "Creator is defined");
  t.is(body.deletedAt, null);
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
      type: "STEP_SUBMISSION_APPROVAL",
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
  const irisStub = sandbox().stub(IrisService, "sendMessage").resolves();
  const notificationStub = sandbox()
    .stub(NotificationService, "sendApprovalStepCommentMentionNotification")
    .resolves();

  const now = new Date();
  sandbox().useFakeTimers(now);
  const {
    design,
    designer,
    collaborator,
    submission,
  } = await setupSubmission();

  const comment = {
    createdAt: now,
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: `test comment @<${collaborator.id}|collaborator>`,
    userId: designer.user.id,
  };

  const [response] = await post(
    `/design-approval-step-submissions/${submission.id}/revision-requests`,
    {
      headers: authHeader(designer.session.id),
      body: {
        comment,
      },
    }
  );

  t.equal(response.status, 204);
  t.deepEqual(notificationStub.args[0][1], {
    actorId: designer.user.id,
    approvalStepId: submission.stepId,
    commentId: comment.id,
    recipientId: collaborator.userId,
  });

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
    const fullComment = {
      ...comment,
      attachments: [],
      mentions: {
        [collaborator.id]: collaborator.user!.name,
      },
      userEmail: designer.user.email,
      userName: designer.user.name,
      userRole: "USER",
    };
    t.deepEquals(
      irisStub.args.map((call: any) => call[0].type),
      [
        "approval-step-submission/created",
        "approval-step-submission/updated",
        "approval-step-submission/revision-request",
        "notification/created",
      ],
      "Sends realtime messages"
    );
    t.deepEquals(
      irisStub.args[2][0].resource.comment,
      fullComment,
      "Realtime message has a comment"
    );

    t.deepEquals(
      omit(irisStub.args[2][0].resource.event, "id"),
      {
        ...templateDesignEventWithMeta,
        actorEmail: designer.user.email,
        actorId: designer.user.id,
        actorName: designer.user.name,
        actorRole: designer.user.role,
        approvalStepId: submission.stepId,
        approvalSubmissionId: submission.id,
        commentId: comment.id,
        createdAt: now,
        designId: design.id,
        type: "REVISION_REQUEST",
        stepTitle: "Checkout",
        submissionTitle: submission.title,
      },
      "Realtime message has an event"
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

test("POST /design-approval-step-submissions/:submissionId/re-review-requests", async (t: Test) => {
  const {
    approvalStep,
    design,
    designer,
    collaborator,
    collaboratorSession,
    submission,
  } = await setupSubmission({
    state: ApprovalStepSubmissionState.REVISION_REQUESTED,
  });
  const [response, body] = await post(
    `/design-approval-step-submissions/${submission.id}/re-review-requests`,
    {
      headers: authHeader(collaboratorSession.id),
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
      type: "STEP_SUBMISSION_RE_REVIEW_REQUEST",
      approvalStepId: approvalStep.id,
      approvalSubmissionId: submission.id,
      submissionTitle: "Submarine",
      actorId: collaborator.user!.id,
      actorName: collaborator.user!.name,
      actorRole: "USER",
      actorEmail: collaborator.user!.email,
    },
    "body is approval event"
  );

  const [failureResponse] = await post(
    `/design-approval-step-submissions/${submission.id}/re-review-requests`,
    {
      headers: authHeader(collaboratorSession.id),
    }
  );
  t.is(failureResponse.status, 409, "Could not re-request review twice");

  await db.transaction(async (trx: Knex.Transaction) => {
    const collaboratorNotifications = await NotificationsDAO.findByUserId(
      trx,
      collaborator.userId!,
      {
        limit: 10,
        offset: 0,
      }
    );
    t.is(
      collaboratorNotifications.length,
      0,
      "does not send a notification to the actor"
    );

    const designerNotifications = await NotificationsDAO.findByUserId(
      trx,
      designer.user.id,
      {
        limit: 10,
        offset: 0,
      }
    );
    t.is(designerNotifications.length, 1);
    t.is(designerNotifications[0].approvalSubmissionId, submission.id);
    t.is(
      designerNotifications[0].type,
      NotificationType.APPROVAL_STEP_SUBMISSION_REREVIEW_REQUEST
    );
  });
});

test("DELETE /design-approval-step-submissions as unauthenticated user", async (t: Test) => {
  sandbox().stub(SessionsDAO, "findById").resolves(null);

  const [unauthenticated] = await del(
    "/design-approval-step-submissions/a-submission-id",
    {
      headers: authHeader("a-session-id"),
    }
  );

  t.equal(unauthenticated.status, 401, "Does not allow unauthenticated users");
});

test("DELETE /design-approval-step-submissions as authenticated user who is not a collaborator", async (t: Test) => {
  const { submission } = await setupSubmission({
    collaboratorId: null,
    teamUserId: null,
    state: ApprovalStepSubmissionState.UNSUBMITTED,
  });
  const user = await createUser({ role: "USER" });

  const [unauthenticated] = await del(
    `/design-approval-step-submissions/${submission.id}`,
    {
      headers: authHeader(user.session.id),
    }
  );

  t.equal(
    unauthenticated.status,
    403,
    "Does not allow for user who is not a collaborator"
  );
});

test("DELETE /design-approval-step-submissions success for clean submission without collaborator, team user and with default state as admin", async (t: Test) => {
  const { submission, approvalStep } = await setupSubmission({
    collaboratorId: null,
    teamUserId: null,
    state: ApprovalStepSubmissionState.UNSUBMITTED,
  });
  const admin = await createUser({ role: "ADMIN" });

  const [getSubmissionsResponse, getSubmissionsBody] = await get(
    `/design-approval-step-submissions?stepId=${approvalStep.id}`,
    {
      headers: authHeader(admin.session.id),
    }
  );

  t.is(getSubmissionsResponse.status, 200);
  t.is(getSubmissionsBody.length, 1);
  t.equal(
    getSubmissionsBody[0].id,
    submission.id,
    "returns saved submission before deletion"
  );

  const [deleteResponse] = await del(
    `/design-approval-step-submissions/${submission.id}`,
    {
      headers: authHeader(admin.session.id),
    }
  );

  t.equal(
    deleteResponse.status,
    204,
    "Allow to delete a clean submission as admin, "
  );

  const [
    submissionsAfterDeleteResponse,
    submissionsAfterDeleteBody,
  ] = await get(`/design-approval-step-submissions?stepId=${approvalStep.id}`, {
    headers: authHeader(admin.session.id),
  });

  t.is(submissionsAfterDeleteResponse.status, 200);
  t.is(
    submissionsAfterDeleteBody.length,
    0,
    "Doesn't return deleted submissions"
  );

  const [deleteAlreadyDeletedResponse] = await del(
    `/design-approval-step-submissions/${submission.id}`,
    {
      headers: authHeader(admin.session.id),
    }
  );

  t.equal(
    deleteAlreadyDeletedResponse.status,
    404,
    "Cannot delete submission which is not exist"
  );
});

test("DELETE /design-approval-step-submissions is not allowed for collaborator with EDIT role outside of the design collection team", async (t: Test) => {
  const { submission, design } = await setupSubmission({
    collaboratorId: null,
    teamUserId: null,
    state: ApprovalStepSubmissionState.UNSUBMITTED,
  });

  const collabEditor = await createUser();
  await db.transaction((trx: Knex.Transaction) =>
    generateCollaborator(
      {
        designId: design.id,
        userId: collabEditor.user.id,
        role: "EDIT",
      },
      trx
    )
  );

  const [deleteResponse] = await del(
    `/design-approval-step-submissions/${submission.id}`,
    {
      headers: authHeader(collabEditor.session.id),
    }
  );

  t.equal(
    deleteResponse.status,
    403,
    "Does not allow to delete submission for collaborator with edit permissions who is not a part of the team with role EDITOR+"
  );
});

test("DELETE /design-approval-step-submissions success as collaborator with EDIT role and team member with EDITOR role", async (t: Test) => {
  const { submission, design } = await setupSubmission({
    collaboratorId: null,
    teamUserId: null,
    state: ApprovalStepSubmissionState.UNSUBMITTED,
  });

  const collabEditor = await createUser();
  await db.transaction((trx: Knex.Transaction) =>
    generateCollaborator(
      {
        designId: design.id,
        userId: collabEditor.user.id,
        role: "EDIT",
      },
      trx
    )
  );

  const teamOwner = await createUser();
  const { team } = await generateTeam(teamOwner.user.id);
  generateTeamUser({
    userId: collabEditor.user.id,
    teamId: team.id,
    role: TeamUserRole.EDITOR,
  });
  const { collection } = await generateCollection({
    createdBy: collabEditor.user.id,
    title: "Collection1",
    teamId: team.id,
  });
  await moveDesign(collection.id, design.id);

  const [deleteResponse] = await del(
    `/design-approval-step-submissions/${submission.id}`,
    {
      headers: authHeader(collabEditor.session.id),
    }
  );

  t.equal(
    deleteResponse.status,
    204,
    "Allow to delete submission for user who is a collaborator with edit permissions and a team user with EDITOR role"
  );
});

test("DELETE /design-approval-step-submissions is allowed for team user with EDITOR role", async (t: Test) => {
  const { submission, design } = await setupSubmission({
    collaboratorId: null,
    teamUserId: null,
    state: ApprovalStepSubmissionState.UNSUBMITTED,
  });

  const teamOwner = await createUser();
  const { team } = await generateTeam(teamOwner.user.id);
  const teamEditor = await createUser();
  generateTeamUser({
    userId: teamEditor.user.id,
    teamId: team.id,
    role: TeamUserRole.EDITOR,
  });

  const collectionOwner = await createUser();
  const { collection } = await generateCollection({
    createdBy: collectionOwner.user.id,
    title: "Collection1",
    teamId: team.id,
  });
  await moveDesign(collection.id, design.id);

  const [deleteResponse] = await del(
    `/design-approval-step-submissions/${submission.id}`,
    {
      headers: authHeader(teamEditor.session.id),
    }
  );

  t.equal(
    deleteResponse.status,
    204,
    "Allow to delete submission for user who is a team user with EDITOR role"
  );
});

test("DELETE /design-approval-step-submissions is not allowed as collaborator with EDIT role and team member with VIEWER role", async (t: Test) => {
  const { submission, design } = await setupSubmission({
    collaboratorId: null,
    teamUserId: null,
    state: ApprovalStepSubmissionState.UNSUBMITTED,
  });

  const collabEditor = await createUser();
  await db.transaction((trx: Knex.Transaction) =>
    generateCollaborator(
      {
        designId: design.id,
        userId: collabEditor.user.id,
        role: "EDIT",
      },
      trx
    )
  );

  const teamOwner = await createUser();
  const { team } = await generateTeam(teamOwner.user.id);
  generateTeamUser({
    userId: collabEditor.user.id,
    teamId: team.id,
    role: TeamUserRole.VIEWER,
  });
  const { collection } = await generateCollection({
    createdBy: collabEditor.user.id,
    title: "Collection1",
    teamId: team.id,
  });
  await moveDesign(collection.id, design.id);

  const [deleteResponse] = await del(
    `/design-approval-step-submissions/${submission.id}`,
    {
      headers: authHeader(collabEditor.session.id),
    }
  );

  t.equal(
    deleteResponse.status,
    403,
    "Does not allow to delete submission for user who is a collaborator with edit permissions and a team user with VIEWER role"
  );
});

test("DELETE /design-approval-step-submissions success for clean submission as creator with VIEW role", async (t: Test) => {
  const { approvalStep, design } = await setupSubmission();

  const collabCreator = await createUser();
  await db.transaction((trx: Knex.Transaction) =>
    generateCollaborator(
      {
        designId: design.id,
        userId: collabCreator.user.id,
        role: "VIEW",
      },
      trx
    )
  );

  const [createSubmissionResponse, createSubmissionBody] = await post(
    `/design-approval-step-submissions?stepId=${approvalStep.id}`,
    {
      headers: authHeader(collabCreator.session.id),
      body: {
        id: uuid.v4(),
        state: ApprovalStepSubmissionState.UNSUBMITTED,
        artifactType: ApprovalStepSubmissionArtifactType.CUSTOM,
        title: "Submarine",
      },
    }
  );

  t.equal(
    createSubmissionResponse.status,
    200,
    "Submission created by collaborator with VIEW role"
  );

  const [deleteResponse] = await del(
    `/design-approval-step-submissions/${createSubmissionBody.id}`,
    {
      headers: authHeader(collabCreator.session.id),
    }
  );

  t.equal(
    deleteResponse.status,
    204,
    "Allow to delete a clean submission as creator with VIEW role"
  );
});

test("DELETE /design-approval-step-submissions success for clean submission as creator with PREVIEW role", async (t: Test) => {
  const { approvalStep, design } = await setupSubmission();

  const collabCreator = await createUser();
  await db.transaction((trx: Knex.Transaction) =>
    generateCollaborator(
      {
        designId: design.id,
        userId: collabCreator.user.id,
        role: "PREVIEW",
      },
      trx
    )
  );

  const [createSubmissionResponse, createSubmissionBody] = await post(
    `/design-approval-step-submissions?stepId=${approvalStep.id}`,
    {
      headers: authHeader(collabCreator.session.id),
      body: {
        id: uuid.v4(),
        state: ApprovalStepSubmissionState.UNSUBMITTED,
        artifactType: ApprovalStepSubmissionArtifactType.CUSTOM,
        title: "Submarine",
      },
    }
  );

  t.equal(
    createSubmissionResponse.status,
    200,
    "Submission created by collaborator with PREVIEW role"
  );

  const [deleteResponse] = await del(
    `/design-approval-step-submissions/${createSubmissionBody.id}`,
    {
      headers: authHeader(collabCreator.session.id),
    }
  );

  t.equal(
    deleteResponse.status,
    204,
    "Allow to delete a clean submission as creator with PREVIEW role"
  );
});

test("DELETE /design-approval-step-submissions success for clean submission as creator with PARTNER role", async (t: Test) => {
  const { approvalStep, design } = await setupSubmission();

  const collabCreator = await createUser();
  await db.transaction((trx: Knex.Transaction) =>
    generateCollaborator(
      {
        designId: design.id,
        userId: collabCreator.user.id,
        role: "PARTNER",
      },
      trx
    )
  );

  const [createSubmissionResponse, createSubmissionBody] = await post(
    `/design-approval-step-submissions?stepId=${approvalStep.id}`,
    {
      headers: authHeader(collabCreator.session.id),
      body: {
        id: uuid.v4(),
        state: ApprovalStepSubmissionState.UNSUBMITTED,
        artifactType: ApprovalStepSubmissionArtifactType.CUSTOM,
        title: "Submarine",
      },
    }
  );

  t.equal(
    createSubmissionResponse.status,
    200,
    "Submission created by collaborator with PARTNER role"
  );

  const [deleteResponse] = await del(
    `/design-approval-step-submissions/${createSubmissionBody.id}`,
    {
      headers: authHeader(collabCreator.session.id),
    }
  );

  t.equal(
    deleteResponse.status,
    204,
    "Allow to delete a clean submission as creator with PARTNER role"
  );
});

test("DELETE /design-approval-step-submissions fail to delete someone else's submission for collaborator with VIEW role", async (t: Test) => {
  const { design, submission } = await setupSubmission();

  const collabCreator = await createUser();
  await db.transaction((trx: Knex.Transaction) =>
    generateCollaborator(
      {
        designId: design.id,
        userId: collabCreator.user.id,
        role: "VIEW",
      },
      trx
    )
  );

  const collabViewer = await createUser();
  await db.transaction((trx: Knex.Transaction) =>
    generateCollaborator(
      {
        designId: design.id,
        userId: collabViewer.user.id,
        role: "VIEW",
      },
      trx
    )
  );

  const [deleteResponse, deleteBody] = await del(
    `/design-approval-step-submissions/${submission.id}`,
    {
      headers: authHeader(collabViewer.session.id),
    }
  );

  t.equal(
    deleteResponse.status,
    403,
    "Don't allow to delete someone else's submission for collaborator with VIEW role"
  );

  t.equal(
    deleteBody.message,
    "To delete the submission the user should be a creator of submission, collaborator of the design with edit permissions or an admin"
  );
});

test("DELETE /design-approval-step-submissions fails to delete someone else's submission as collaborator with PREVIEW role", async (t: Test) => {
  const { submission, design } = await setupSubmission({
    collaboratorId: null,
    teamUserId: null,
    state: ApprovalStepSubmissionState.UNSUBMITTED,
  });

  const collabEditor = await createUser();
  await db.transaction((trx: Knex.Transaction) =>
    generateCollaborator(
      {
        designId: design.id,
        userId: collabEditor.user.id,
        role: "PREVIEW",
      },
      trx
    )
  );

  const [deleteResponse] = await del(
    `/design-approval-step-submissions/${submission.id}`,
    {
      headers: authHeader(collabEditor.session.id),
    }
  );

  t.equal(
    deleteResponse.status,
    403,
    "Don't allow to delete someone else's submission for collaborator with PREVIEW role"
  );
});

test("DELETE /design-approval-step-submissions fails to delete someone else's submission as collaborator with PARTNER role", async (t: Test) => {
  const { submission, design } = await setupSubmission({
    collaboratorId: null,
    teamUserId: null,
    state: ApprovalStepSubmissionState.UNSUBMITTED,
  });

  const collabEditor = await createUser();
  await db.transaction((trx: Knex.Transaction) =>
    generateCollaborator(
      {
        designId: design.id,
        userId: collabEditor.user.id,
        role: "PARTNER",
      },
      trx
    )
  );

  const [deleteResponse] = await del(
    `/design-approval-step-submissions/${submission.id}`,
    {
      headers: authHeader(collabEditor.session.id),
    }
  );

  t.equal(
    deleteResponse.status,
    403,
    "Don't allow to delete someone else's submission for collaborator with PARTNER role"
  );
});

test("DELETE /design-approval-step-submissions fail for submission with collaborator assignee", async (t: Test) => {
  const { submission, collaborator } = await setupSubmission({
    collaboratorId: null,
    teamUserId: null,
    state: ApprovalStepSubmissionState.UNSUBMITTED,
  });
  const admin = await createUser({ role: "ADMIN" });

  await patch(`/design-approval-step-submissions/${submission.id}`, {
    headers: authHeader(admin.session.id),
    body: {
      collaboratorId: collaborator.id,
    },
  });

  const [deleteResponse, deleteBody] = await del(
    `/design-approval-step-submissions/${submission.id}`,
    {
      headers: authHeader(admin.session.id),
    }
  );

  t.equal(
    deleteResponse.status,
    400,
    "Deletion is not possible for submission with assignee"
  );

  t.equal(
    deleteBody.message,
    "Submission deleting is allowed only for submission without assignee"
  );
});

test("DELETE /design-approval-step-submissions fail for submission with team user assignee", async (t: Test) => {
  const { user } = await createUser();
  const { teamUser } = await generateTeam(user.id);
  const { submission } = await setupSubmission({
    collaboratorId: null,
    teamUserId: teamUser.id,
    state: ApprovalStepSubmissionState.UNSUBMITTED,
  });
  const admin = await createUser({ role: "ADMIN" });

  const [deleteResponse, deleteBody] = await del(
    `/design-approval-step-submissions/${submission.id}`,
    {
      headers: authHeader(admin.session.id),
    }
  );

  t.equal(
    deleteResponse.status,
    400,
    "Deletion is not possible for submission with team user assignee"
  );

  t.equal(
    deleteBody.message,
    "Submission deleting is allowed only for submission without assignee"
  );
});

test("DELETE /design-approval-step-submissions fail for submission with changed state", async (t: Test) => {
  const admin = await createUser({ role: "ADMIN" });

  const { submission: submittedSubmission } = await setupSubmission({
    collaboratorId: null,
    teamUserId: null,
    state: ApprovalStepSubmissionState.SUBMITTED,
  });

  const [
    deleteSubmittedSubmissionResponse,
    deleteSubmittedSubmissionBody,
  ] = await del(`/design-approval-step-submissions/${submittedSubmission.id}`, {
    headers: authHeader(admin.session.id),
  });

  t.equal(
    deleteSubmittedSubmissionResponse.status,
    400,
    "Deletion is not possible for submission with SUMBITTED state"
  );

  const expectedErrorMessage =
    "Submission deleting is allowed only for submission with UNSUBMITTED state";
  t.equal(deleteSubmittedSubmissionBody.message, expectedErrorMessage);

  const { submission: approvedSubmission } = await setupSubmission({
    collaboratorId: null,
    teamUserId: null,
    state: ApprovalStepSubmissionState.APPROVED,
  });

  const [
    deleteApprovedSubmissionResponse,
    deleteApprovedSubmissionBody,
  ] = await del(`/design-approval-step-submissions/${approvedSubmission.id}`, {
    headers: authHeader(admin.session.id),
  });

  t.equal(
    deleteApprovedSubmissionResponse.status,
    400,
    "Deletion is not possible for submission with APPROVED state"
  );

  t.equal(deleteApprovedSubmissionBody.message, expectedErrorMessage);

  const { submission: revisionRequestedSubmission } = await setupSubmission({
    collaboratorId: null,
    teamUserId: null,
    state: ApprovalStepSubmissionState.REVISION_REQUESTED,
  });

  const [
    deleteRevisionRequestedSubmissionResponse,
    deleteRevisionRequestedSubmissionBody,
  ] = await del(
    `/design-approval-step-submissions/${revisionRequestedSubmission.id}`,
    {
      headers: authHeader(admin.session.id),
    }
  );

  t.equal(
    deleteRevisionRequestedSubmissionResponse.status,
    400,
    "Deletion is not possible for submission with APPROVED state"
  );

  t.equal(deleteRevisionRequestedSubmissionBody.message, expectedErrorMessage);

  const { submission: skippedSubmission } = await setupSubmission({
    collaboratorId: null,
    teamUserId: null,
    state: ApprovalStepSubmissionState.SKIPPED,
  });

  const [
    deleteSkippedSubmissionResponse,
    deleteSkippedSubmissionBody,
  ] = await del(`/design-approval-step-submissions/${skippedSubmission.id}`, {
    headers: authHeader(admin.session.id),
  });

  t.equal(
    deleteSkippedSubmissionResponse.status,
    400,
    "Deletion is not possible for submission with SKIPPED state"
  );

  t.equal(deleteSkippedSubmissionBody.message, expectedErrorMessage);
});
