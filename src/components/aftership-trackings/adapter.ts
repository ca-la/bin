import { buildAdapter } from "../../services/cala-component/cala-adapter";
import { AftershipTracking, AftershipTrackingRow, domain } from "./types";

function encode(row: AftershipTrackingRow): AftershipTracking {
  return {
    createdAt: row.created_at,
    id: row.id,
    shipmentTrackingId: row.shipment_tracking_id,
  };
}

function decode(data: AftershipTracking): AftershipTrackingRow {
  return {
    created_at: data.createdAt,
    id: data.id,
    shipment_tracking_id: data.shipmentTrackingId,
  };
}

export default buildAdapter({
  domain,
  requiredProperties: ["createdAt", "id", "shipmentTrackingId"],
  encodeTransformer: encode,
  decodeTransformer: decode,
});
