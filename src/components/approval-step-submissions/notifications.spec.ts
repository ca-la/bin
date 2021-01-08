import { sandbox, test, Test } from "../../test-helpers/fresh";
import db from "../../services/db";
import "../approval-steps/notifications";
import notifications from "./notifications";
import * as NotificationAnnouncer from "../iris/messages/notification";
import generateApprovalStep from "../../test-helpers/factories/design-approval-step";
import generateCollection from "../../test-helpers/factories/collection";
import { addDesigns } from "../collections/dao/design";
import { NotificationType } from "../notifications/domain-object";
import { findByUserId } from "../notifications/dao";
import createUser from "../../test-helpers/create-user";
import generateCollaborator from "../../test-helpers/factories/collaborator";
import generateApprovalSubmission from "../../test-helpers/factories/design-approval-submission";
import { CollaboratorWithUser } from "../../components/collaborators/types";
import ApprovalStep from "../approval-steps/domain-object";
import ProductDesign from "../product-designs/domain-objects/product-design";
import CollectionDb from "../collections/domain-object";
import ApprovalStepSubmission from "./types";

const prepareAssets = async (): Promise<{
  actor: any;
  recipient: any;
  collaborator: CollaboratorWithUser;
  approvalStep: ApprovalStep;
  design: ProductDesign;
  collection: CollectionDb;
  submission: ApprovalStepSubmission;
}> => {
  const { user: actor } = await createUser();
  const { user: recipient } = await createUser();

  const prepareTrx = await db.transaction();
  try {
    const { design, approvalStep } = await generateApprovalStep(prepareTrx);
    const { submission } = await generateApprovalSubmission(prepareTrx, {
      stepId: approvalStep.id,
      title: "Review X",
    });
    const { collection } = await generateCollection({ createdBy: actor.id });
    await addDesigns({
      collectionId: collection.id,
      designIds: [design.id],
      trx: prepareTrx,
    });
    await prepareTrx.commit();
    const { collaborator } = await generateCollaborator({
      designId: design.id,
      userId: recipient.id,
    });

    return {
      actor,
      recipient,
      collaborator,
      design,
      approvalStep,
      submission,
      collection,
    };
  } catch (err) {
    await prepareTrx.rollback();
    throw err;
  }
};

test("ApprovalSubmissions notifications", async (t: Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});

  const {
    actor,
    recipient,
    collaborator,
    design,
    approvalStep,
    submission,
    collection,
  } = await prepareAssets();

  const testCases = [
    {
      title: "APPROVAL_STEP_SUBMISSION_ASSIGNMENT",
      type: NotificationType.APPROVAL_STEP_SUBMISSION_ASSIGNMENT,
      notification: {
        collectionId: collection.id,
        collaboratorId: collaborator.id,
        designId: design.id,
        approvalStepId: approvalStep.id,
        approvalSubmissionId: submission.id,
      },
      parts: [
        actor.name,
        " assigned you to review ",
        submission.title,
        design.title,
        design.id,
      ],
      textParts: ["Assigned you to review ", submission.title],
    },
    {
      title: "APPROVAL_STEP_SUBMISSION_APPROVAL",
      type: NotificationType.APPROVAL_STEP_SUBMISSION_APPROVAL,
      notification: {
        collectionId: collection.id,
        designId: design.id,
        approvalStepId: approvalStep.id,
        approvalSubmissionId: submission.id,
      },
      parts: [actor.name, " approved ", submission.title],
      textParts: ["Approved ", submission.title],
    },
    {
      title: "APPROVAL_STEP_SUBMISSION_REVISION_REQUEST",
      type: NotificationType.APPROVAL_STEP_SUBMISSION_REVISION_REQUEST,
      notification: {
        collectionId: collection.id,
        designId: design.id,
        approvalStepId: approvalStep.id,
        approvalSubmissionId: submission.id,
      },
      parts: [actor.name, " requested revisions to ", submission.title],
      textParts: ["Requested revisions to ", submission.title],
    },
    {
      title: "APPROVAL_STEP_SUBMISSION_REREVIEW_REQUEST",
      type: NotificationType.APPROVAL_STEP_SUBMISSION_REREVIEW_REQUEST,
      notification: {
        collectionId: collection.id,
        designId: design.id,
        approvalStepId: approvalStep.id,
        approvalSubmissionId: submission.id,
      },
      parts: [actor.name, " requested re-review of ", submission.title],
      textParts: ["Requested re-review of ", submission.title],
    },
  ];
  for (const testCase of testCases) {
    const trx = await db.transaction();
    try {
      const notificationComponent =
        notifications[testCase.type as keyof typeof notifications];
      const send = notificationComponent.send as (
        trx: any,
        actorId: any,
        data: any
      ) => Promise<void>;
      await send(trx, actor.id, {
        ...testCase.notification,
        recipientUserId: recipient.id,
      });
      const ns = await findByUserId(trx, recipient.id, {
        limit: 20,
        offset: 0,
      });
      t.is(ns.length, 1, `${testCase.title} / creates exactly 1 notification`);
      const message = await notificationComponent.messageBuilder(ns[0]);
      t.is(
        testCase.parts.every(
          (part: string) => message && message.html.includes(part)
        ),
        true,
        `${testCase.title} / notification message contains expected html parts`
      );
      t.is(
        testCase.textParts.every(
          (part: string) => message && message.text.includes(part)
        ),
        true,
        `${testCase.title} / notification message contains expected text parts`
      );
    } finally {
      await trx.rollback();
    }
  }
});
