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
  const { designEvent } = await generateDesignEvent({
    actorId: designer.user.id,
    designId: design.id,
    approvalSubmissionId: submission.id,
    type: allEventsSchema.enum.STEP_SUBMISSION_APPROVAL,
  });
  const eventApproval = await DesignEventsDAO.findOne(db, {
    id: designEvent.id,
  });

  t.deepEqual(
    await DesignEventsDAO.findSubmissionEvents(db, submission.id),
    [eventApproval],
    "Finds submission events"
  );
});
