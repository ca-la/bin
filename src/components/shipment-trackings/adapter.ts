import { buildAdapter } from "../../services/cala-component/cala-adapter";
import { ShipmentTracking, ShipmentTrackingRow, domain } from "./types";

function encode(row: ShipmentTrackingRow): ShipmentTracking {
  return {
    approvalStepId: row.approval_step_id,
    courier: row.courier,
    createdAt: row.created_at,
    description: row.description,
    id: row.id,
    trackingId: row.tracking_id,
    deliveryDate: row.delivery_date,
    expectedDelivery: row.expected_delivery,
  };
}

function decode(data: ShipmentTracking): ShipmentTrackingRow {
  return {
    approval_step_id: data.approvalStepId,
    courier: data.courier,
    created_at: data.createdAt,
    description: data.description,
    id: data.id,
    tracking_id: data.trackingId,
    delivery_date: data.deliveryDate,
    expected_delivery: data.expectedDelivery,
  };
}

export default buildAdapter({
  domain,
  requiredProperties: [
    "approvalStepId",
    "courier",
    "createdAt",
    "description",
    "id",
    "trackingId",
    "expectedDelivery",
    "deliveryDate",
  ],
  encodeTransformer: encode,
  decodeTransformer: decode,
});
