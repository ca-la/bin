import { ShipmentTracking } from "./types";

const AFTERSHIP_CUSTOM_DOMAIN = "https://cala.aftership.com";

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
