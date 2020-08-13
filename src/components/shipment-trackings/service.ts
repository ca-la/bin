import Knex from "knex";
import Logger from "../../services/logger";
import { DeliveryStatus, ShipmentTracking } from "./types";
import * as Aftership from "../integrations/aftership/service";
import * as ShipmentTrackingEventsDAO from "../shipment-tracking-events/dao";
import * as ShipmentTrackingsDAO from "./dao";
import * as ShipmentTrackingEventService from "../shipment-tracking-events/service";
import { enqueueSend } from "../../services/slack";
import { ShipmentTrackingEvent } from "../shipment-tracking-events/types";
import getLinks, { LinkType } from "../notifications/get-links";
import { getTitleAndOwnerByShipmentTracking } from "../product-designs/dao/dao";

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
  _: Knex.Transaction,
  shipmentTracking: ShipmentTracking
): Promise<ShipmentTracking & { deliveryStatus: DeliveryStatus }> {
  const { tracking } = await Aftership.getTracking(
    shipmentTracking.courier,
    shipmentTracking.trackingId
  );

  return {
    ...shipmentTracking,
    deliveryStatus: {
      tag: tracking ? tracking.tag : "Pending",
      expectedDelivery: shipmentTracking.expectedDelivery,
      deliveryDate: shipmentTracking.deliveryDate,
    },
  };
}

export async function handleTrackingUpdates(
  trx: Knex.Transaction,
  updates: Aftership.TrackingUpdate[]
): Promise<void> {
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
        .filter((event: ShipmentTrackingEvent) => event.tag === "Exception")
        .slice(-1)[0];

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
      // TODO: Create appropriate notification
      // TODO: Create appropriate activity stream item
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
