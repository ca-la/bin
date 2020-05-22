import { sandbox, test, Test } from "../../test-helpers/fresh";
import db from "../../services/db";
import notifications from "./notifications";
import * as NotificationAnnouncer from "../iris/messages/notification";
import generateApprovalStep from "../../test-helpers/factories/design-approval-step";
import generateCollection from "../../test-helpers/factories/collection";
import { addDesigns } from "../collections/dao/design";
import { NotificationType } from "../notifications/domain-object";
import { findByUserId } from "../notifications/dao";
import createUser from "../../test-helpers/create-user";
import generateCollaborator from "../../test-helpers/factories/collaborator";
import { CollaboratorWithUser } from "../collaborators/domain-objects/collaborator";
import ApprovalStep from "./domain-object";
import ProductDesign from "../product-designs/domain-objects/product-design";
import Collection from "../collections/domain-object";

const prepareAssets = async (): Promise<{
  actor: any;
  recipient: any;
  collaborator: CollaboratorWithUser;
  approvalStep: ApprovalStep;
  design: ProductDesign;
  collection: Collection;
}> => {
  const prepareTrx = await db.transaction();
  try {
    const { user: actor } = await createUser();
    const { user: recipient } = await createUser();
    const { design, approvalStep } = await generateApprovalStep(prepareTrx);
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
      collection,
    };
  } catch (err) {
    await prepareTrx.rollback();
    throw err;
  }
};

test("ApprovalSteps notifications", async (t: Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});

  const {
    actor,
    recipient,
    collaborator,
    design,
    approvalStep,
    collection,
  } = await prepareAssets();

  const testCases = [
    {
      title: "APPROVAL_STEP_ASSIGNMENT",
      type: NotificationType.APPROVAL_STEP_ASSIGNMENT,
      notification: {
        collectionId: collection.id,
        collaboratorId: collaborator.id,
        designId: design.id,
        approvalStepId: approvalStep.id,
      },
      parts: [
        actor.name,
        " assigned you to ",
        approvalStep.title,
        design.title,
        design.id,
      ],
    },
    {
      title: "APPROVAL_STEP_COMPLETION",
      type: NotificationType.APPROVAL_STEP_COMPLETION,
      notification: {
        collectionId: collection.id,
        designId: design.id,
        approvalStepId: approvalStep.id,
      },
      parts: [
        actor.name,
        " completed ",
        approvalStep.title,
        " on ",
        design.title,
        design.id,
      ],
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
        `${testCase.title} / notification message contains expected parts`
      );
    } finally {
      await trx.rollback();
    }
  }
});
