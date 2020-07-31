import Knex from "knex";
import { DeliveryStatus, ShipmentTracking } from "./types";
import Aftership from "../integrations/aftership/service";
import { ShipmentTrackingEvent } from "../shipment-tracking-events/types";
import * as ShipmentTrackingEventsDAO from "../shipment-tracking-events/dao";
import ShipmentTrackingEventService from "../shipment-tracking-events/service";

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
  shipmentTracking: ShipmentTracking
): Promise<ShipmentTracking & { deliveryStatus: DeliveryStatus }> {
  return {
    ...shipmentTracking,
    deliveryStatus: await Aftership.getDeliveryStatus(
      shipmentTracking.courier,
      shipmentTracking.trackingId
    ),
  };
}

export async function handleTrackingUpdate(
  trx: Knex.Transaction,
  shipmentTrackingId: string,
  events: ShipmentTrackingEvent[]
): Promise<void> {
  const newEvents = await ShipmentTrackingEventService.diff(
    trx,
    shipmentTrackingId,
    events
  );

  if (newEvents.length > 0) {
    await ShipmentTrackingEventsDAO.createAll(trx, newEvents);
    // TODO: Create appropriate notification
    // TODO: Create appropriate activity stream item
  }
}
