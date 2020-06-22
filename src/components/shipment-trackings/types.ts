export enum Courier {
  USPS = "usps",
  UPS = "ups",
  FEDEX = "fedex",
  DHL = "dhl",
}

export interface ShipmentTracking {
  id: string;
  courier: Courier;
  trackingId: string;
  description: string | null;
  approvalStepId: string;
  createdAt: Date;
}

export interface ShipmentTrackingRow {
  id: string;
  courier: Courier;
  tracking_id: string;
  description: string | null;
  approval_step_id: string;
  created_at: Date;
}

export const domain = "ShipmentTracking" as "ShipmentTracking";

type Keyset<T> = { [P in keyof T]: unknown };

export function isShipmentTrackingRow(
  candidate: object
): candidate is ShipmentTrackingRow {
  const keyset = new Set(Object.keys(candidate));
  const keysetMatch = [
    "id",
    "courier",
    "tracking_id",
    "description",
    "approval_step_id",
    "created_at",
  ].every((key: string) => keyset.has(key));

  if (!keysetMatch) {
    return false;
  }

  const courierMatch = new Set(Object.values(Courier)).has(
    (candidate as Keyset<ShipmentTrackingRow>).courier as Courier
  );

  return courierMatch;
}
