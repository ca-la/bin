import uuid from "node-uuid";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import db from "../../services/db";
import * as IrisService from "../iris/send-message";
import {
  DaoUpdated,
  DaoCreated,
  RouteUpdated,
  RouteDeleted,
} from "../../services/pubsub/cala-events";
import DesignEventsDAO from "../design-events/dao";
import * as CollaboratorsDAO from "../collaborators/dao";
import { rawDao as RawTeamUsersDAO } from "../team-users/dao";
import DesignsDAO from "../product-designs/dao";
import ApprovalStepsDAO from "../approval-steps/dao";
import { templateDesignEvent } from "../design-events/types";
import { NotificationType } from "../notifications/types";
import ApprovalStepSubmissionsDAO from "./dao";
import {
  approvalStepSubmissionDomain,
  ApprovalStepSubmissionArtifactType,
  ApprovalStepSubmissionState,
  ApprovalStepSubmissionDb,
} from "./types";
import { listeners } from "./listeners";
import * as SubmissionNotifications from "./notifications";
import * as SubmissionService from "./service";

const now = new Date();
const submission: ApprovalStepSubmissionDb = {
  id: "sub-1",
  stepId: "step-1",
  createdAt: now,
  createdBy: null,
  deletedAt: null,
  artifactType: ApprovalStepSubmissionArtifactType.CUSTOM,
  state: ApprovalStepSubmissionState.UNSUBMITTED,
  collaboratorId: null,
  teamUserId: null,
  title: "Garment Sample",
};

function setup() {
  return {
    uuidStub: sandbox().stub(uuid, "v4").returns("uuid"),
    findCollaboratorStub: sandbox().stub(CollaboratorsDAO, "findById"),
    findTeamUserStub: sandbox().stub(RawTeamUsersDAO, "findById"),
    irisStub: sandbox().stub(IrisService, "sendMessage").resolves(),
    designEventCreateStub: sandbox().stub(DesignEventsDAO, "create"),
    findApprovalStepStub: sandbox().stub(ApprovalStepsDAO, "findById"),
    clock: sandbox().useFakeTimers(now),
    findDesignStub: sandbox()
      .stub(DesignsDAO, "findById")
      .resolves({ id: "d1", collections: [], collectionIds: [] }),
    findSubmissionByIdStub: sandbox()
      .stub(ApprovalStepSubmissionsDAO, "findById")
      .resolves({ ...submission, commentCount: 0 }),
    findDeletedSubmissionStub: sandbox()
      .stub(ApprovalStepSubmissionsDAO, "findDeleted")
      .resolves({ ...submission, commentCount: 0, deletedAt: now }),
  };
}

test("dao.updated.state", async (t: Test) => {
  const { irisStub, findSubmissionByIdStub } = setup();

  findSubmissionByIdStub.resolves({
    ...submission,
    state: ApprovalStepSubmissionState.SUBMITTED,
    collaboratorId: "collabo-id",
    commentCount: 0,
  });

  const trx = await db.transaction();

  try {
    const event: DaoUpdated<
      ApprovalStepSubmissionDb,
      typeof approvalStepSubmissionDomain
    > = {
      trx,
      type: "dao.updated",
      domain: approvalStepSubmissionDomain,
      before: submission,
      updated: {
        ...submission,
        state: ApprovalStepSubmissionState.SUBMITTED,
        collaboratorId: "collabo-id",
      },
    };

    if (!listeners["dao.updated"]) {
      throw new Error("dao.updated is empty");
    }

    await listeners["dao.updated"](event);

    t.deepEquals(
      irisStub.args[0][0],
      {
        type: "approval-step-submission/updated",
        resource: {
          id: "sub-1",
          stepId: "step-1",
          createdAt: now,
          createdBy: null,
          deletedAt: null,
          artifactType: "CUSTOM",
          state: ApprovalStepSubmissionState.SUBMITTED,
          collaboratorId: "collabo-id",
          teamUserId: null,
          title: "Garment Sample",
          commentCount: 0,
        },
        channels: ["approval-steps/step-1", "submissions/sub-1"],
      },
      "Updates via realtime on state change"
    );
  } finally {
    await trx.rollback();
  }
});

test("dao.created", async (t: Test) => {
  const { irisStub } = setup();

  const trx = await db.transaction();

  try {
    const event: DaoCreated<
      ApprovalStepSubmissionDb,
      typeof approvalStepSubmissionDomain
    > = {
      trx,
      type: "dao.created",
      domain: approvalStepSubmissionDomain,
      created: submission,
    };

    if (!listeners["dao.created"]) {
      throw new Error("dao.updated.*.state is empty");
    }

    await listeners["dao.created"](event);

    t.deepEquals(
      irisStub.args[0][0],
      {
        type: "approval-step-submission/created",
        resource: {
          id: "sub-1",
          stepId: "step-1",
          createdAt: now,
          createdBy: null,
          deletedAt: null,
          artifactType: "CUSTOM",
          state: ApprovalStepSubmissionState.UNSUBMITTED,
          collaboratorId: null,
          teamUserId: null,
          title: "Garment Sample",
          commentCount: 0,
        },
        channels: ["approval-steps/step-1", "submissions/sub-1"],
      },
      "Sends message via realtime on create"
    );
  } finally {
    await trx.rollback();
  }
});

test("route.updated.*.state: UNSUBMITTED", async (t: Test) => {
  const {
    findApprovalStepStub,
    findCollaboratorStub,
    designEventCreateStub,
  } = setup();
  const notifierStub = sandbox()
    .stub(
      SubmissionNotifications.default[
        NotificationType.APPROVAL_STEP_SUBMISSION_UNSTARTED
      ],
      "send"
    )
    .resolves();

  sandbox()
    .stub(SubmissionService, "getRecipientsByStepSubmissionAndDesign")
    .resolves([
      {
        recipientUserId: "u2",
        recipientCollaboratorId: null,
        recipientTeamUserId: null,
      },
      {
        recipientUserId: null,
        recipientCollaboratorId: "collab1",
        recipientTeamUserId: null,
      },
      {
        recipientUserId: null,
        recipientCollaboratorId: null,
        recipientTeamUserId: "tu1",
      },
    ]);

  findApprovalStepStub.resolves({
    id: "step-1",
    designId: "d1",
  });
  findCollaboratorStub.resolves({
    id: "c1",
    userId: "u2",
  });

  const trx = await db.transaction();

  try {
    const event: RouteUpdated<
      ApprovalStepSubmissionDb,
      typeof approvalStepSubmissionDomain
    > = {
      trx,
      type: "route.updated",
      domain: approvalStepSubmissionDomain,
      before: {
        ...submission,
        state: ApprovalStepSubmissionState.SUBMITTED,
      },
      updated: {
        ...submission,
        state: ApprovalStepSubmissionState.UNSUBMITTED,
      },
      actorId: "u1",
    };

    await listeners["route.updated.*"]!.state!(event);

    t.deepEquals(
      designEventCreateStub.args,
      [
        [
          trx,
          {
            ...templateDesignEvent,
            actorId: "u1",
            approvalStepId: "step-1",
            approvalSubmissionId: "sub-1",
            createdAt: now,
            designId: "d1",
            id: "uuid",
            type: "STEP_SUBMISSION_UNSTARTED",
          },
        ],
      ],
      "Creates correct design event"
    );

    const data = {
      approvalStepId: "step-1",
      approvalSubmissionId: "sub-1",
      designId: "d1",
      collectionId: null,
    };
    t.deepEquals(
      notifierStub.args,
      [
        [
          trx,
          "u1",
          {
            recipientUserId: "u2",
            recipientCollaboratorId: null,
            recipientTeamUserId: null,
          },
          data,
        ],
        [
          trx,
          "u1",
          {
            recipientUserId: null,
            recipientCollaboratorId: "collab1",
            recipientTeamUserId: null,
          },
          data,
        ],
        [
          trx,
          "u1",
          {
            recipientUserId: null,
            recipientCollaboratorId: null,
            recipientTeamUserId: "tu1",
          },
          data,
        ],
      ],
      "Sends notifications to all recipients"
    );
  } finally {
    await trx.rollback();
  }
});

test("route.updated.*.state: SUBMITTED", async (t: Test) => {
  const {
    findApprovalStepStub,
    findCollaboratorStub,
    designEventCreateStub,
  } = setup();
  const notifierStub = sandbox()
    .stub(
      SubmissionNotifications.default[
        NotificationType.APPROVAL_STEP_SUBMISSION_REREVIEW_REQUEST
      ],
      "send"
    )
    .resolves();

  sandbox()
    .stub(SubmissionService, "getRecipientsByStepSubmissionAndDesign")
    .resolves([
      {
        recipientUserId: "u2",
        recipientCollaboratorId: null,
        recipientTeamUserId: null,
      },
      {
        recipientUserId: null,
        recipientCollaboratorId: "collab1",
        recipientTeamUserId: null,
      },
      {
        recipientUserId: null,
        recipientCollaboratorId: null,
        recipientTeamUserId: "tu1",
      },
    ]);

  findApprovalStepStub.resolves({
    id: "step-1",
    designId: "d1",
  });
  findCollaboratorStub.resolves({
    id: "c1",
    userId: "u2",
  });

  const trx = await db.transaction();

  try {
    const event: RouteUpdated<
      ApprovalStepSubmissionDb,
      typeof approvalStepSubmissionDomain
    > = {
      trx,
      type: "route.updated",
      domain: approvalStepSubmissionDomain,
      before: {
        ...submission,
        state: ApprovalStepSubmissionState.UNSUBMITTED,
      },
      updated: {
        ...submission,
        state: ApprovalStepSubmissionState.SUBMITTED,
      },
      actorId: "u1",
    };

    await listeners["route.updated.*"]!.state!(event);

    t.deepEquals(
      designEventCreateStub.args,
      [
        [
          trx,
          {
            ...templateDesignEvent,
            actorId: "u1",
            approvalStepId: "step-1",
            approvalSubmissionId: "sub-1",
            createdAt: now,
            designId: "d1",
            id: "uuid",
            type: "STEP_SUBMISSION_RE_REVIEW_REQUEST",
          },
        ],
      ],
      "Creates correct design event"
    );

    const data = {
      approvalStepId: "step-1",
      approvalSubmissionId: "sub-1",
      designId: "d1",
      collectionId: null,
    };
    t.deepEquals(
      notifierStub.args,
      [
        [
          trx,
          "u1",
          {
            recipientUserId: "u2",
            recipientCollaboratorId: null,
            recipientTeamUserId: null,
          },
          data,
        ],
        [
          trx,
          "u1",
          {
            recipientUserId: null,
            recipientCollaboratorId: "collab1",
            recipientTeamUserId: null,
          },
          data,
        ],
        [
          trx,
          "u1",
          {
            recipientUserId: null,
            recipientCollaboratorId: null,
            recipientTeamUserId: "tu1",
          },
          data,
        ],
      ],
      "Sends notifications to all recipients"
    );
  } finally {
    await trx.rollback();
  }
});

test("route.updated.*.state: APPROVED", async (t: Test) => {
  const {
    findApprovalStepStub,
    findCollaboratorStub,
    designEventCreateStub,
  } = setup();
  const notifierStub = sandbox()
    .stub(
      SubmissionNotifications.default[
        NotificationType.APPROVAL_STEP_SUBMISSION_APPROVAL
      ],
      "send"
    )
    .resolves();

  sandbox()
    .stub(SubmissionService, "getRecipientsByStepSubmissionAndDesign")
    .resolves([
      {
        recipientUserId: "u2",
        recipientCollaboratorId: null,
        recipientTeamUserId: null,
      },
      {
        recipientUserId: null,
        recipientCollaboratorId: "collab1",
        recipientTeamUserId: null,
      },
      {
        recipientUserId: null,
        recipientCollaboratorId: null,
        recipientTeamUserId: "tu1",
      },
    ]);

  findApprovalStepStub.resolves({
    id: "step-1",
    designId: "d1",
  });
  findCollaboratorStub.resolves({
    id: "c1",
    userId: "u2",
  });

  const trx = await db.transaction();

  try {
    const event: RouteUpdated<
      ApprovalStepSubmissionDb,
      typeof approvalStepSubmissionDomain
    > = {
      trx,
      type: "route.updated",
      domain: approvalStepSubmissionDomain,
      before: {
        ...submission,
        state: ApprovalStepSubmissionState.SUBMITTED,
      },
      updated: {
        ...submission,
        state: ApprovalStepSubmissionState.APPROVED,
      },
      actorId: "u1",
    };

    await listeners["route.updated.*"]!.state!(event);

    t.deepEquals(
      designEventCreateStub.args,
      [
        [
          trx,
          {
            ...templateDesignEvent,
            actorId: "u1",
            approvalStepId: "step-1",
            approvalSubmissionId: "sub-1",
            createdAt: now,
            designId: "d1",
            id: "uuid",
            type: "STEP_SUBMISSION_APPROVAL",
          },
        ],
      ],
      "Creates correct design event"
    );

    const data = {
      approvalStepId: "step-1",
      approvalSubmissionId: "sub-1",
      designId: "d1",
      collectionId: null,
    };
    t.deepEquals(
      notifierStub.args,
      [
        [
          trx,
          "u1",
          {
            recipientUserId: "u2",
            recipientCollaboratorId: null,
            recipientTeamUserId: null,
          },
          data,
        ],
        [
          trx,
          "u1",
          {
            recipientUserId: null,
            recipientCollaboratorId: "collab1",
            recipientTeamUserId: null,
          },
          data,
        ],
        [
          trx,
          "u1",
          {
            recipientUserId: null,
            recipientCollaboratorId: null,
            recipientTeamUserId: "tu1",
          },
          data,
        ],
      ],
      "Sends notifications to all recipients"
    );
  } finally {
    await trx.rollback();
  }
});

test("route.updated: collaborator assigned", async (t: Test) => {
  const {
    findApprovalStepStub,
    findCollaboratorStub,
    designEventCreateStub,
  } = setup();

  findApprovalStepStub.resolves({
    id: "step-1",
    designId: "d1",
  });
  findCollaboratorStub.resolves({
    id: "c1",
    userId: "u2",
  });

  const trx = await db.transaction();

  try {
    const fromNull: RouteUpdated<
      ApprovalStepSubmissionDb,
      typeof approvalStepSubmissionDomain
    > = {
      trx,
      type: "route.updated",
      domain: approvalStepSubmissionDomain,
      updated: {
        ...submission,
        collaboratorId: "c1",
      },
      before: submission,
      actorId: "u1",
    };

    await listeners["route.updated"]!(fromNull);

    t.deepEquals(
      designEventCreateStub.args[0],
      [
        trx,
        {
          ...templateDesignEvent,
          actorId: "u1",
          approvalStepId: "step-1",
          approvalSubmissionId: "sub-1",
          createdAt: now,
          designId: "d1",
          id: "uuid",
          targetId: "u2",
          type: "STEP_SUBMISSION_ASSIGNMENT",
        },
      ],
      "assignment from null creates design event"
    );

    const fromTeamUser: RouteUpdated<
      ApprovalStepSubmissionDb,
      typeof approvalStepSubmissionDomain
    > = {
      trx,
      type: "route.updated",
      domain: approvalStepSubmissionDomain,
      updated: {
        ...submission,
        collaboratorId: "c1",
      },
      before: {
        ...submission,
        teamUserId: "tu1",
      },
      actorId: "u1",
    };

    await listeners["route.updated"]!(fromTeamUser);

    t.deepEquals(
      designEventCreateStub.args[1],
      [
        trx,
        {
          ...templateDesignEvent,
          actorId: "u1",
          approvalStepId: "step-1",
          approvalSubmissionId: "sub-1",
          createdAt: now,
          designId: "d1",
          id: "uuid",
          targetId: "u2",
          type: "STEP_SUBMISSION_ASSIGNMENT",
        },
      ],
      "assignment from team user creates design event"
    );

    const fromCollaborator: RouteUpdated<
      ApprovalStepSubmissionDb,
      typeof approvalStepSubmissionDomain
    > = {
      trx,
      type: "route.updated",
      domain: approvalStepSubmissionDomain,
      updated: {
        ...submission,
        collaboratorId: "c1",
      },
      before: {
        ...submission,
        collaboratorId: "c2",
      },
      actorId: "u1",
    };

    await listeners["route.updated"]!(fromCollaborator);

    t.deepEquals(
      designEventCreateStub.args[2],
      [
        trx,
        {
          ...templateDesignEvent,
          actorId: "u1",
          approvalStepId: "step-1",
          approvalSubmissionId: "sub-1",
          createdAt: now,
          designId: "d1",
          id: "uuid",
          targetId: "u2",
          type: "STEP_SUBMISSION_ASSIGNMENT",
        },
      ],
      "assignment from collaborator creates design event"
    );

    const sameCollaborator: RouteUpdated<
      ApprovalStepSubmissionDb,
      typeof approvalStepSubmissionDomain
    > = {
      trx,
      type: "route.updated",
      domain: approvalStepSubmissionDomain,
      updated: {
        ...submission,
        collaboratorId: "c1",
      },
      before: {
        ...submission,
        collaboratorId: "c1",
      },
      actorId: "u1",
    };

    await listeners["route.updated"]!(sameCollaborator);

    t.equals(
      designEventCreateStub.args[3],
      undefined,
      "assignment to the same user does not make a new design event"
    );
  } finally {
    await trx.rollback();
  }
});

test("route.updated: teamUser assigned", async (t: Test) => {
  const {
    findApprovalStepStub,
    findTeamUserStub,
    designEventCreateStub,
  } = setup();

  findApprovalStepStub.resolves({
    id: "step-1",
    designId: "d1",
  });
  findTeamUserStub.resolves({
    id: "tu1",
    userId: "u2",
  });

  const trx = await db.transaction();

  try {
    const fromNull: RouteUpdated<
      ApprovalStepSubmissionDb,
      typeof approvalStepSubmissionDomain
    > = {
      trx,
      type: "route.updated",
      domain: approvalStepSubmissionDomain,
      updated: {
        ...submission,
        teamUserId: "tu1",
      },
      before: submission,
      actorId: "u1",
    };

    await listeners["route.updated"]!(fromNull);

    t.deepEquals(
      designEventCreateStub.args[0],
      [
        trx,
        {
          ...templateDesignEvent,
          actorId: "u1",
          approvalStepId: "step-1",
          approvalSubmissionId: "sub-1",
          createdAt: now,
          designId: "d1",
          id: "uuid",
          targetId: "u2",
          type: "STEP_SUBMISSION_ASSIGNMENT",
        },
      ],
      "assignment from null creates design event"
    );

    const fromTeamUser: RouteUpdated<
      ApprovalStepSubmissionDb,
      typeof approvalStepSubmissionDomain
    > = {
      trx,
      type: "route.updated",
      domain: approvalStepSubmissionDomain,
      updated: {
        ...submission,
        teamUserId: "tu1",
      },
      before: {
        ...submission,
        teamUserId: "tu2",
      },
      actorId: "u1",
    };

    await listeners["route.updated"]!(fromTeamUser);

    t.deepEquals(
      designEventCreateStub.args[1],
      [
        trx,
        {
          ...templateDesignEvent,
          actorId: "u1",
          approvalStepId: "step-1",
          approvalSubmissionId: "sub-1",
          createdAt: now,
          designId: "d1",
          id: "uuid",
          targetId: "u2",
          type: "STEP_SUBMISSION_ASSIGNMENT",
        },
      ],
      "assignment from team user creates design event"
    );

    const fromCollaborator: RouteUpdated<
      ApprovalStepSubmissionDb,
      typeof approvalStepSubmissionDomain
    > = {
      trx,
      type: "route.updated",
      domain: approvalStepSubmissionDomain,
      updated: {
        ...submission,
        teamUserId: "tu1",
      },
      before: {
        ...submission,
        collaboratorId: "c1",
      },
      actorId: "u1",
    };

    await listeners["route.updated"]!(fromCollaborator);

    t.deepEquals(
      designEventCreateStub.args[2],
      [
        trx,
        {
          ...templateDesignEvent,
          actorId: "u1",
          approvalStepId: "step-1",
          approvalSubmissionId: "sub-1",
          createdAt: now,
          designId: "d1",
          id: "uuid",
          targetId: "u2",
          type: "STEP_SUBMISSION_ASSIGNMENT",
        },
      ],
      "assignment from collaborator creates design event"
    );

    const sameTeamUser: RouteUpdated<
      ApprovalStepSubmissionDb,
      typeof approvalStepSubmissionDomain
    > = {
      trx,
      type: "route.updated",
      domain: approvalStepSubmissionDomain,
      updated: {
        ...submission,
        teamUserId: "tu1",
      },
      before: {
        ...submission,
        teamUserId: "tu1",
      },
      actorId: "u1",
    };

    await listeners["route.updated"]!(sameTeamUser);

    t.equals(
      designEventCreateStub.args[3],
      undefined,
      "assignment to the same user does not make a new design event"
    );
  } finally {
    await trx.rollback();
  }
});

test("route.updated: unassigned", async (t: Test) => {
  const { findApprovalStepStub, designEventCreateStub } = setup();

  findApprovalStepStub.resolves({
    id: "step-1",
    designId: "d1",
  });

  const trx = await db.transaction();

  try {
    const fromTeamUser: RouteUpdated<
      ApprovalStepSubmissionDb,
      typeof approvalStepSubmissionDomain
    > = {
      trx,
      type: "route.updated",
      domain: approvalStepSubmissionDomain,
      updated: {
        ...submission,
        teamUserId: null,
      },
      before: {
        ...submission,
        teamUserId: "tu2",
      },
      actorId: "u1",
    };

    await listeners["route.updated"]!(fromTeamUser);

    t.deepEquals(
      designEventCreateStub.args[0],
      [
        trx,
        {
          ...templateDesignEvent,
          actorId: "u1",
          approvalStepId: "step-1",
          approvalSubmissionId: "sub-1",
          createdAt: now,
          designId: "d1",
          id: "uuid",
          targetId: null,
          type: "STEP_SUBMISSION_UNASSIGNMENT",
        },
      ],
      "unassignment from team user creates design event"
    );

    const fromCollaborator: RouteUpdated<
      ApprovalStepSubmissionDb,
      typeof approvalStepSubmissionDomain
    > = {
      trx,
      type: "route.updated",
      domain: approvalStepSubmissionDomain,
      updated: {
        ...submission,
        collaboratorId: null,
      },
      before: {
        ...submission,
        collaboratorId: "c1",
      },
      actorId: "u1",
    };

    await listeners["route.updated"]!(fromCollaborator);

    t.deepEquals(
      designEventCreateStub.args[1],
      [
        trx,
        {
          ...templateDesignEvent,
          actorId: "u1",
          approvalStepId: "step-1",
          approvalSubmissionId: "sub-1",
          createdAt: now,
          designId: "d1",
          id: "uuid",
          targetId: null,
          type: "STEP_SUBMISSION_UNASSIGNMENT",
        },
      ],
      "unassignment from collaborator creates design event"
    );

    const fromNull: RouteUpdated<
      ApprovalStepSubmissionDb,
      typeof approvalStepSubmissionDomain
    > = {
      trx,
      type: "route.updated",
      domain: approvalStepSubmissionDomain,
      updated: submission,
      before: submission,
      actorId: "u1",
    };

    await listeners["route.updated"]!(fromNull);

    t.equals(
      designEventCreateStub.args[2],
      undefined,
      "unassignment to unassigned submission does not make a new design event"
    );
  } finally {
    await trx.rollback();
  }
});

test("route.deleted", async (t: Test) => {
  const { irisStub, findDeletedSubmissionStub } = setup();

  findDeletedSubmissionStub.resolves({
    ...submission,
    deletedAt: now,
    commentCount: 0,
  });

  const trx = await db.transaction();

  try {
    const event: RouteDeleted<
      ApprovalStepSubmissionDb,
      typeof approvalStepSubmissionDomain
    > = {
      trx,
      type: "route.deleted",
      domain: approvalStepSubmissionDomain,
      deleted: submission,
      actorId: "u1",
    };

    if (!listeners["route.deleted"]) {
      throw new Error("route.deleted is empty");
    }

    await listeners["route.deleted"](event);

    t.deepEquals(
      irisStub.args[0][0],
      {
        type: "approval-step-submission/deleted",
        resource: {
          id: "sub-1",
          stepId: "step-1",
          createdAt: now,
          createdBy: null,
          deletedAt: now,
          artifactType: "CUSTOM",
          state: ApprovalStepSubmissionState.UNSUBMITTED,
          collaboratorId: null,
          teamUserId: null,
          title: "Garment Sample",
          commentCount: 0,
        },
        channels: ["approval-steps/step-1", "submissions/sub-1"],
      },
      "Sends message via realtime on delete"
    );
  } finally {
    await trx.rollback();
  }
});
