import { ShipmentTracking } from "./types";
import { DeliveryStatus } from "../integrations/aftership/types";
import Aftership from "../integrations/aftership/service";

const AFTERSHIP_CUSTOM_DOMAIN = "https://track.ca.la";

function getAftershipTrackingLink(id: string): string {
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
