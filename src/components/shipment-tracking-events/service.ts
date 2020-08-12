import Knex from "knex";

import * as ShipmentTrackingEventsDAO from "./dao";
import { ShipmentTrackingEvent } from "./types";

export async function diff(
  trx: Knex.Transaction,
  shipmentTrackingId: string,
  otherEvents: ShipmentTrackingEvent[]
): Promise<ShipmentTrackingEvent[]> {
  const existingEvents = await ShipmentTrackingEventsDAO.find(trx, {
    shipmentTrackingId,
  });

  if (existingEvents.length === 0) {
    return otherEvents;
  }

  return otherEvents.slice(existingEvents.length);
}
