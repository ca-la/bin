import Knex from "knex";

import * as ShipmentTrackingEventsDAO from "./dao";
import { ShipmentTrackingEvent } from "./types";

async function diff(
  trx: Knex.Transaction,
  shipmentTrackingId: string,
  otherEvents: ShipmentTrackingEvent[]
): Promise<ShipmentTrackingEvent[]> {
  const newestEvent = await ShipmentTrackingEventsDAO.findLatestByShipmentTracking(
    trx,
    shipmentTrackingId
  );

  if (!newestEvent) {
    return otherEvents;
  }

  return otherEvents.filter(
    (event: ShipmentTrackingEvent) => event.createdAt > newestEvent.createdAt
  );
}

export default {
  diff,
};
