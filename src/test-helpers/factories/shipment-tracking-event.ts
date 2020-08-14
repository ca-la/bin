import Knex from "knex";
import uuid from "node-uuid";

import generateApprovalStep from "./design-approval-step";
import * as ShipmentTrackingEventsDAO from "../../components/shipment-tracking-events/dao";
import { ShipmentTrackingEvent } from "../../components/shipment-tracking-events/types";
import generateShipmentTracking from "./shipment-tracking";

export default async function generateShipmentTrackingEvent(
  trx: Knex.Transaction,
  options: Partial<ShipmentTrackingEvent> = {}
): Promise<ShipmentTrackingEvent> {
  const stepId = (await generateApprovalStep(trx)).approvalStep.id;

  const trackingId =
    options.shipmentTrackingId ||
    (
      await generateShipmentTracking(trx, {
        approvalStepId: stepId,
      })
    ).id;

  const trackingEvent = await ShipmentTrackingEventsDAO.create(trx, {
    id: uuid.v4(),
    shipmentTrackingId: trackingId,
    createdAt: new Date(),
    courier: "usps",
    tag: "Pending",
    subtag: "Pending_001",
    location: null,
    country: null,
    message: null,
    courierTimestamp: new Date(),
    courierTag: null,
    ...options,
  });

  return trackingEvent;
}
