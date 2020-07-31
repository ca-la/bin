import { buildAdapter } from "../../services/cala-component/cala-adapter";
import {
  ShipmentTrackingEvent,
  ShipmentTrackingEventRow,
  domain,
} from "./types";

function encode(row: ShipmentTrackingEventRow): ShipmentTrackingEvent {
  return {
    id: row.id,
    shipmentTrackingId: row.shipment_tracking_id,
    createdAt: row.created_at,
    courier: row.courier,
    tag: row.tag,
    subtag: row.subtag,
    location: row.location,
    country: row.country,
    message: row.message,
    courierTimestamp: row.courier_timestamp,
    courierTag: row.courier_tag,
  };
}

function decode(data: ShipmentTrackingEvent): ShipmentTrackingEventRow {
  return {
    id: data.id,
    shipment_tracking_id: data.shipmentTrackingId,
    created_at: data.createdAt,
    courier: data.courier,
    tag: data.tag,
    subtag: data.subtag,
    location: data.location,
    country: data.country,
    message: data.message,
    courier_timestamp: data.courierTimestamp,
    courier_tag: data.courierTag,
  };
}

export default buildAdapter({
  domain,
  requiredProperties: [
    "id",
    "shipmentTrackingId",
    "createdAt",
    "courier",
    "tag",
    "subtag",
    "location",
    "country",
    "message",
    "courierTimestamp",
    "courierTag",
  ],
  encodeTransformer: encode,
  decodeTransformer: decode,
});
