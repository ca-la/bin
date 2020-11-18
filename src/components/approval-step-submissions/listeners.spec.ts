import uuid from "node-uuid";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import db from "../../services/db";
import * as IrisService from "../iris/send-message";
import {
  DaoUpdated,
  DaoCreated,
  RouteUpdated,
} from "../../services/pubsub/cala-events";
import DesignEventsDAO from "../design-events/dao";
import * as CollaboratorsDAO from "../collaborators/dao";
import { rawDao as RawTeamUsersDAO } from "../team-users/dao";
import ApprovalStepsDAO from "../approval-steps/dao";
import ApprovalStepSubmission, {
  approvalStepSubmissionDomain,
  ApprovalStepSubmissionArtifactType,
  ApprovalStepSubmissionState,
} from "./types";
import { listeners } from "./listeners";
import { templateDesignEvent } from "../design-events/types";

const now = new Date();
const submission: ApprovalStepSubmission = {
  id: "sub-1",
  stepId: "step-1",
  createdAt: now,
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
  };
}

test("dao.updated.state", async (t: Test) => {
  const { irisStub } = setup();

  const trx = await db.transaction();

  try {
    const event: DaoUpdated<
      ApprovalStepSubmission,
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
          artifactType: "CUSTOM",
          state: ApprovalStepSubmissionState.SUBMITTED,
          collaboratorId: "collabo-id",
          teamUserId: null,
          title: "Garment Sample",
        },
        approvalStepId: "step-1",
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
      ApprovalStepSubmission,
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
          artifactType: "CUSTOM",
          state: ApprovalStepSubmissionState.UNSUBMITTED,
          collaboratorId: null,
          teamUserId: null,
          title: "Garment Sample",
        },
        approvalStepId: "step-1",
      },
      "Sends message via realtime on create"
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
      ApprovalStepSubmission,
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
      ApprovalStepSubmission,
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
      ApprovalStepSubmission,
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
      ApprovalStepSubmission,
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
      ApprovalStepSubmission,
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
      ApprovalStepSubmission,
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
      ApprovalStepSubmission,
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
      ApprovalStepSubmission,
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
      ApprovalStepSubmission,
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
          type: "STEP_SUBMISSION_ASSIGNMENT",
        },
      ],
      "unassignment from team user creates design event"
    );

    const fromCollaborator: RouteUpdated<
      ApprovalStepSubmission,
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
          type: "STEP_SUBMISSION_ASSIGNMENT",
        },
      ],
      "unassignment from collaborator creates design event"
    );

    const fromNull: RouteUpdated<
      ApprovalStepSubmission,
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
