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
const submission = {
  id: "sub-1",
  stepId: "step-1",
  createdAt: now,
  artifactType: ApprovalStepSubmissionArtifactType.CUSTOM,
  state: ApprovalStepSubmissionState.UNSUBMITTED,
  collaboratorId: null,
  title: "Garment Sample",
};

test("dao.updated.state", async (t: Test) => {
  const irisStub = sandbox().stub(IrisService, "sendMessage").resolves();

  sandbox().useFakeTimers(now);

  const trx = await db.transaction();

  const event: DaoUpdated<
    ApprovalStepSubmission,
    typeof approvalStepSubmissionDomain
  > = {
    trx,
    type: "dao.updated",
    domain: approvalStepSubmissionDomain,
    before: submission,
    updated: { ...submission, state: ApprovalStepSubmissionState.SUBMITTED },
  };

  if (!listeners["dao.updated.*"] || !listeners["dao.updated.*"].state) {
    throw new Error("dao.updated.*.state is empty");
  }

  await listeners["dao.updated.*"].state(event);

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
        collaboratorId: null,
        title: "Garment Sample",
      },
      approvalStepId: "step-1",
    },
    "Updates via realtime on state change"
  );
  await trx.rollback();
});

test("dao.created", async (t: Test) => {
  const irisStub = sandbox().stub(IrisService, "sendMessage").resolves();

  sandbox().useFakeTimers(now);

  const trx = await db.transaction();

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
        title: "Garment Sample",
      },
      approvalStepId: "step-1",
    },
    "Sends message via realtime on create"
  );
  await trx.rollback();
});
