export interface ShipmentTracking {
  id: string;
  courier: string;
  trackingId: string;
  description: string | null;
  approvalStepId: string;
  createdAt: Date;
}

export interface ShipmentTrackingRow {
  id: string;
  courier: string;
  tracking_id: string;
  description: string | null;
  approval_step_id: string;
  created_at: Date;
}

export const domain = "ShipmentTracking" as "ShipmentTracking";

export function isShipmentTrackingRow(
  candidate: object
): candidate is ShipmentTrackingRow {
  const keyset = new Set(Object.keys(candidate));
  return [
    "id",
    "courier",
    "tracking_id",
    "description",
    "approval_step_id",
    "created_at",
  ].every((key: string) => keyset.has(key));
}
