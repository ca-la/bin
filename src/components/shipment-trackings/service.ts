import Knex from "knex";
import uuid from "node-uuid";
import Logger from "../../services/logger";
import { DeliveryStatus, ShipmentTracking } from "./types";
import notifications from "./notifications";
import * as Aftership from "../integrations/aftership/service";
import * as ShipmentTrackingEventsDAO from "../shipment-tracking-events/dao";
import * as ShipmentTrackingsDAO from "./dao";
import * as ShipmentTrackingEventService from "../shipment-tracking-events/service";
import * as DesignEventsDAO from "../design-events/dao";
import { NotificationType } from "../notifications/domain-object";
import { CALA_OPS_USER_ID } from "../../config";
import { enqueueSend } from "../../services/slack";
import { ShipmentTrackingEvent } from "../shipment-tracking-events/types";
import getLinks, { LinkType } from "../notifications/get-links";
import { getTitleAndOwnerByShipmentTracking } from "../product-designs/dao/dao";
import { templateDesignEvent } from "../design-events/types";

const AFTERSHIP_CUSTOM_DOMAIN = "https://track.ca.la";

export function getAftershipTrackingLink(id: string): string {
  return `${AFTERSHIP_CUSTOM_DOMAIN}/${id}`;
}

export function attachTrackingLink(
  shipmentTracking: ShipmentTracking
): ShipmentTracking & { trackingLink: string } {
  return {
    ...shipmentTracking,
    trackingLink: getAftershipTrackingLink(shipmentTracking.trackingId),
  };
}

export async function attachDeliveryStatus(
  _: Knex,
  shipmentTracking: ShipmentTracking
): Promise<ShipmentTracking & { deliveryStatus: DeliveryStatus }> {
  let tag = "Pending";

  try {
    const { tracking } = await Aftership.getTracking(
      shipmentTracking.courier,
      shipmentTracking.trackingId
    );

    if (tracking && tracking.tag) {
      tag = tracking.tag;
    }
  } catch (err) {
    Logger.logWarning(err.message);
  }

  return {
    ...shipmentTracking,
    deliveryStatus: {
      tag,
      expectedDelivery: shipmentTracking.expectedDelivery,
      deliveryDate: shipmentTracking.deliveryDate,
    },
  };
}

export const attachMeta = async (
  ktx: Knex,
  shipmentTracking: ShipmentTracking
) => {
  return {
    ...attachTrackingLink(shipmentTracking),
    ...(await attachDeliveryStatus(ktx, shipmentTracking)),
  };
};

export async function handleTrackingUpdates(
  trx: Knex.Transaction,
  updates: Aftership.TrackingUpdate[]
): Promise<ShipmentTracking[]> {
  const updatedShipmentTrackings: ShipmentTracking[] = [];
  for (const {
    shipmentTrackingId,
    expectedDelivery,
    deliveryDate,
    events,
  } of updates) {
    const { updated } = await ShipmentTrackingsDAO.update(
      trx,
      shipmentTrackingId,
      {
        expectedDelivery,
        deliveryDate,
      }
    );

    const newEvents = await ShipmentTrackingEventService.diff(
      trx,
      shipmentTrackingId,
      events
    );

    if (newEvents.length > 0) {
      await ShipmentTrackingEventsDAO.createAll(trx, newEvents);
      const lastException = newEvents
        .filter(
          (event: ShipmentTrackingEvent) =>
            event.tag === "Exception" || event.tag === "AttemptFail"
        )
        .slice(-1)[0];
      updatedShipmentTrackings.push(updated);

      if (lastException) {
        try {
          await sendSlackException(trx, updated, lastException.message);
        } catch (err) {
          Logger.logServerError(
            "Could not deliver slack message for delivery exception",
            err.message
          );
        }
      }
    }
  }
  return updatedShipmentTrackings;
}

export async function createNotificationsAndEvents(
  trx: Knex.Transaction,
  shipmentTrackings: ShipmentTracking[]
): Promise<void> {
  const notififiedDesigners: string[] = [];
  for (const shipmentTracking of shipmentTrackings) {
    const latestTrackingEvent = await ShipmentTrackingEventsDAO.findLatestByShipmentTracking(
      trx,
      shipmentTracking.id
    );
    if (!latestTrackingEvent) {
      throw new Error("Could not find latest tracking event");
    }
    const designMeta = await getTitleAndOwnerByShipmentTracking(
      trx,
      shipmentTracking.id
    );

    if (!designMeta) {
      throw new Error(
        `Could not find the design for shipment ${shipmentTracking.id}`
      );
    }

    const { designId, designerId, collectionId } = designMeta;

    const latestDesignEvent = await DesignEventsDAO.findOne(
      trx,
      {
        designId,
        type: "TRACKING_UPDATE",
      },
      (query: Knex.QueryBuilder): Knex.QueryBuilder =>
        query.clearOrder().orderBy("created_at", "DESC")
    );

    if (
      latestDesignEvent &&
      latestDesignEvent.shipmentTrackingEventTag === latestTrackingEvent.tag
    ) {
      return;
    }

    if (!notififiedDesigners.includes(designerId)) {
      notififiedDesigners.push(designerId);
      await notifications[NotificationType.SHIPMENT_TRACKING_UPDATE].send(
        trx,
        CALA_OPS_USER_ID,
        {
          recipientUserId: designerId,
          recipientCollaboratorId: null,
          recipientTeamUserId: null,
        },
        {
          approvalStepId: shipmentTracking.approvalStepId,
          designId,
          collectionId,
          shipmentTrackingId: shipmentTracking.id,
          shipmentTrackingEventId: latestTrackingEvent.id,
        }
      );
      await DesignEventsDAO.create(trx, {
        ...templateDesignEvent,
        id: uuid.v4(),
        designId,
        approvalStepId: shipmentTracking.approvalStepId,
        createdAt: new Date(),
        actorId: CALA_OPS_USER_ID,
        shipmentTrackingId: shipmentTracking.id,
        shipmentTrackingEventId: latestTrackingEvent.id,
        type: "TRACKING_UPDATE",
      });
    }
  }
}

async function sendSlackException(
  trx: Knex.Transaction,
  shipmentTracking: ShipmentTracking,
  exceptionMessage: string | null
) {
  const designMeta = await getTitleAndOwnerByShipmentTracking(
    trx,
    shipmentTracking.id
  );

  if (!designMeta) {
    throw new Error(
      `Could not find the design for shipment ${shipmentTracking.id}`
    );
  }

  const { designId, designTitle, designerName } = designMeta;

  const { deepLink: designLink } = getLinks({
    type: LinkType.ShipmentTracking,
    design: { id: designId, title: designTitle },
    approvalStep: { id: shipmentTracking.approvalStepId, title: null },
    shipmentTrackingId: shipmentTracking.id,
  });
  await enqueueSend({
    channel: "shipment-tracking",
    params: {
      designTitle,
      designerName,
      message: exceptionMessage,
      designLink,
      trackingLink: getAftershipTrackingLink(shipmentTracking.trackingId),
      trackingDescription: shipmentTracking.description,
    },
    templateName: "shipment_exception",
  });
}
