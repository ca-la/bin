import { sandbox, test, Test } from "../../test-helpers/fresh";
import db from "../../services/db";
import * as IrisService from "../iris/send-message";
import { DaoUpdated, DaoCreated } from "../../services/pubsub/cala-events";
import ApprovalStepSubmission, {
  approvalStepSubmissionDomain,
  ApprovalStepSubmissionArtifactType,
  ApprovalStepSubmissionState,
} from "./types";
import { listeners } from "./listeners";

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
    irisStub: sandbox().stub(IrisService, "sendMessage").resolves(),
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
