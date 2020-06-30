export interface AftershipTracking {
  id: string;
  shipmentTrackingId: string;
  createdAt: Date;
}

export interface AftershipTrackingRow {
  id: string;
  shipment_tracking_id: string;
  created_at: Date;
}

export const domain = "AftershipTracking" as "AftershipTracking";
