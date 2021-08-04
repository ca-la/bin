import createUser from "../../test-helpers/create-user";
import generateDesignEvent from "../../test-helpers/factories/design-event";
import { test, Test, db } from "../../test-helpers/fresh";
import { setupSubmission } from "../../test-helpers/factories/design-approval-submission";

import { allEventsSchema } from "./types";
import DesignEventsDAO from "./dao";

async function setup() {
  const admin = await createUser({
    role: "ADMIN",
    withSession: false,
  });

  return {
    admin,
    ...(await setupSubmission()),
  };
}

test("DesignEventsDAO.findSubmissionEvents", async (t: Test) => {
  const { admin, designer, design, submission } = await setup();

  await generateDesignEvent({
    actorId: designer.user.id,
    designId: design.id,
    type: allEventsSchema.enum.SUBMIT_DESIGN,
  });
  await generateDesignEvent({
    actorId: admin.user.id,
    designId: design.id,
    type: allEventsSchema.enum.COMMIT_COST_INPUTS,
  });
  await generateDesignEvent({
    actorId: admin.user.id,
    designId: design.id,
    type: allEventsSchema.enum.BID_DESIGN,
  });
  const { designEvent: event1 } = await generateDesignEvent({
    actorId: designer.user.id,
    designId: design.id,
    approvalSubmissionId: submission.id,
    type: allEventsSchema.enum.STEP_SUBMISSION_CREATION,
  });
  const { designEvent: event2 } = await generateDesignEvent({
    actorId: designer.user.id,
    designId: design.id,
    approvalStepId: submission.stepId,
    approvalSubmissionId: submission.id,
    type: allEventsSchema.enum.STEP_SUBMISSION_APPROVAL,
  });
  const eventCreation = await DesignEventsDAO.findById(db, event1.id);
  const eventApproval = await DesignEventsDAO.findById(db, event2.id);

  t.deepEqual(
    await DesignEventsDAO.findSubmissionEvents(db, submission.id),
    [eventCreation, eventApproval],
    "Finds submission events"
  );
});

test("DesignEventsDAO.findApprovalStepEvents", async (t: Test) => {
  const { admin, designer, design, approvalStep, submission } = await setup();

  const { designEvent: event1 } = await generateDesignEvent({
    actorId: designer.user.id,
    designId: design.id,
    approvalStepId: approvalStep.id,
    type: allEventsSchema.enum.SUBMIT_DESIGN,
  });
  const { designEvent: event2 } = await generateDesignEvent({
    actorId: admin.user.id,
    designId: design.id,
    approvalStepId: approvalStep.id,
    type: allEventsSchema.enum.COMMIT_COST_INPUTS,
  });
  const { designEvent: event4 } = await generateDesignEvent({
    actorId: designer.user.id,
    designId: design.id,
    approvalStepId: approvalStep.id,
    approvalSubmissionId: submission.id,
    type: allEventsSchema.enum.STEP_SUBMISSION_APPROVAL,
  });
  await generateDesignEvent({
    actorId: admin.user.id,
    designId: design.id,
    approvalStepId: approvalStep.id,
    type: allEventsSchema.enum.BID_DESIGN,
  });
  await generateDesignEvent({
    actorId: designer.user.id,
    designId: design.id,
    approvalSubmissionId: submission.id,
    type: allEventsSchema.enum.STEP_SUBMISSION_CREATION,
  });
  const eventSubmit = await DesignEventsDAO.findById(db, event1.id);
  const eventCost = await DesignEventsDAO.findById(db, event2.id);
  const eventApprove = await DesignEventsDAO.findById(db, event4.id);

  t.deepEqual(
    await DesignEventsDAO.findApprovalStepEvents(
      db,
      approvalStep.designId,
      approvalStep.id
    ),
    [eventSubmit, eventCost, eventApprove],
    "Finds approval step events"
  );
});
