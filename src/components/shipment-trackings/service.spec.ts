import { sandbox, test, Test } from "../../test-helpers/fresh";

import * as ShipmentTrackingEventsDAO from "../shipment-tracking-events/dao";
import db from "../../services/db";
import * as DesignEventsDAO from "../design-events/dao";
import * as ProductDesignsDAO from "../product-designs/dao/dao";
import { NotificationType } from "../notifications/domain-object";
import { ShipmentTrackingTag } from "../integrations/aftership/types";
import * as AftershipService from "../integrations/aftership/service";

import NotificationsLayer from "./notifications";
import { createNotificationsAndEvents, attachDeliveryStatus } from "./service";
import { ShipmentTracking } from "./types";

function setup({
  designEventTag,
  shipmentTrackingEventTag,
}: {
  designEventTag: ShipmentTrackingTag;
  shipmentTrackingEventTag: ShipmentTrackingTag;
}) {
  sandbox().stub(DesignEventsDAO, "findOne").resolves({
    shipmentTrackingEventTag: designEventTag,
  });

  sandbox()
    .stub(ShipmentTrackingEventsDAO, "findLatestByShipmentTracking")
    .resolves({
      id: "tracking-event-id",
      tag: shipmentTrackingEventTag,
    });
  sandbox()
    .stub(ProductDesignsDAO, "getTitleAndOwnerByShipmentTracking")
    .resolves({
      designId: "design-id",
      designTitle: "Titled Tee",
      designerName: "Ray",
      designerId: "a-designer-id",
      collectionId: null,
    });

  const createDesignEventStub = sandbox()
    .stub(DesignEventsDAO, "create")
    .resolves();

  const sendNotificationStub = sandbox().stub(
    NotificationsLayer[NotificationType.SHIPMENT_TRACKING_UPDATE],
    "send"
  );

  return { createDesignEventStub, sendNotificationStub };
}

test("createNotificationsAndEvents creates notifications and events", async (t: Test) => {
  const { createDesignEventStub, sendNotificationStub } = setup({
    designEventTag: "Pending",
    shipmentTrackingEventTag: "InTransit",
  });

  const trx = await db.transaction();
  try {
    await createNotificationsAndEvents(trx, [
      {
        id: "a-shipment-tracking-id",
        approvalStepId: "an-approval-step-id",
      } as ShipmentTracking,
    ]);

    t.equal(
      sendNotificationStub.callCount,
      1,
      "Sends a notification for the non-duplicate event"
    );
    const createdEvent = createDesignEventStub.args[0][1];
    t.deepEqual(
      {
        designId: createdEvent.designId,
        approvalStepId: createdEvent.approvalStepId,
        shipmentTrackingId: createdEvent.shipmentTrackingId,
        shipmentTrackingEventId: createdEvent.shipmentTrackingEventId,
        type: "TRACKING_UPDATE",
      },
      {
        designId: "design-id",
        approvalStepId: "an-approval-step-id",
        shipmentTrackingId: "a-shipment-tracking-id",
        shipmentTrackingEventId: "tracking-event-id",
        type: "TRACKING_UPDATE",
      },

      "Sends a notification for the non-duplicate event"
    );
  } finally {
    trx.rollback();
  }
});

test("createNotificationsAndEvents prevents duplicate events", async (t: Test) => {
  const { createDesignEventStub, sendNotificationStub } = setup({
    designEventTag: "InTransit",
    shipmentTrackingEventTag: "InTransit",
  });

  const trx = await db.transaction();
  try {
    await createNotificationsAndEvents(trx, [
      {
        id: "a-shipment-tracking-id",
        approvalStepId: "an-approval-step-id",
      } as ShipmentTracking,
    ]);

    t.equal(sendNotificationStub.callCount, 0, "Does not send a notification");

    t.equal(createDesignEventStub.callCount, 0, "Does not create an event");
  } finally {
    trx.rollback();
  }
});

test("attachDeliveryStatus", async (t: Test) => {
  const shipmentTracking: ShipmentTracking = {
    approvalStepId: "an-approval-step-id",
    courier: "a-courier-slug",
    createdAt: new Date(),
    deliveryDate: null,
    description: "A shipment",
    expectedDelivery: null,
    id: "a-shipment-tracking-id",
    trackingId: "a-courier-tracking-id",
  };

  const trx = await db.transaction();

  try {
    const aftershipStub = sandbox()
      .stub(AftershipService, "getTracking")
      .resolves({
        tracking: {
          tag: "A NEW TAG",
        },
      });

    t.deepEqual(
      await attachDeliveryStatus(trx, shipmentTracking),
      {
        ...shipmentTracking,
        deliveryStatus: {
          tag: "A NEW TAG",
          expectedDelivery: null,
          deliveryDate: null,
        },
      },
      "valid response / Attaches the tag from Aftership response"
    );

    aftershipStub.throws(new Error("Some message to log"));
    t.deepEqual(
      await attachDeliveryStatus(trx, shipmentTracking),
      {
        ...shipmentTracking,
        deliveryStatus: {
          tag: "Pending",
          expectedDelivery: null,
          deliveryDate: null,
        },
      },
      "invalid response / Uses a fallback tag"
    );
  } finally {
    await trx.rollback();
  }
});
