import uuid from "node-uuid";

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
import { CollaboratorWithUser } from "../collaborators/types";
import ProductDesign from "../product-designs/domain-objects/product-design";
import Collection from "../collections/domain-object";
import ApprovalStep from "../approval-steps/types";
import Aftership from "../integrations/aftership/service";
import { ShipmentTracking } from "./types";
import generateShipmentTracking from "../../test-helpers/factories/shipment-tracking";

const prepareAssets = async (): Promise<{
  actor: any;
  recipient: any;
  collaborator: CollaboratorWithUser;
  approvalStep: ApprovalStep;
  design: ProductDesign;
  collection: Collection;
  shipmentTracking: ShipmentTracking;
}> => {
  const prepareTrx = await db.transaction();
  try {
    const { user: actor } = await createUser();
    const { user: recipient } = await createUser();
    const { design, approvalStep } = await generateApprovalStep(prepareTrx);
    const { collection } = await generateCollection({ createdBy: actor.id });
    const shipmentTracking = await generateShipmentTracking(prepareTrx, {
      approvalStepId: approvalStep.id,
      courier: "usps",
      id: uuid.v4(),
      trackingId: "123",
      createdAt: new Date(),
      description: "Garment samples",
    });
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
      shipmentTracking,
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
  sandbox().stub(Aftership, "createTracking");

  const {
    actor,
    recipient,
    collaborator,
    design,
    approvalStep,
    collection,
    shipmentTracking,
  } = await prepareAssets();

  const testCases = [
    {
      title: "SHIPMENT_TRACKING_CREATE",
      type: NotificationType.SHIPMENT_TRACKING_CREATE,
      notification: {
        collectionId: collection.id,
        collaboratorId: collaborator.id,
        designId: design.id,
        approvalStepId: approvalStep.id,
        shipmentTrackingId: shipmentTracking.id,
      },
      parts: [actor.name, " added tracking to ", design.title],
      attachmentParts: [
        shipmentTracking.description,
        ": ",
        shipmentTracking.trackingId,
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
      t.is(
        testCase.attachmentParts.every(
          (part: string | null) =>
            message && part && message.attachments[0].text.includes(part)
        ),
        true,
        `${testCase.title} / notification attachment message contains expected parts`
      );
    } finally {
      await trx.rollback();
    }
  }
});
