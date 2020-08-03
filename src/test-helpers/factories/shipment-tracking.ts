import Knex from "knex";
import uuid from "node-uuid";

import generateApprovalStep from "./design-approval-step";
import * as ShipmentTrackingsDAO from "../../components/shipment-trackings/dao";
import { ShipmentTracking } from "../../components/shipment-trackings/types";

export default async function generateShipmentTracking(
  trx: Knex.Transaction,
  options: Partial<ShipmentTracking> = {}
): Promise<ShipmentTracking> {
  const stepId =
    options.approvalStepId || (await generateApprovalStep(trx)).approvalStep.id;

  const tracking = await ShipmentTrackingsDAO.create(trx, {
    id: uuid.v4(),
    courier: "usps",
    trackingId: "usps-123",
    description: "Garment sample",
    approvalStepId: stepId,
    createdAt: new Date(),
    deliveryDate: null,
    expectedDelivery: null,
    ...options,
  });

  return tracking;
}
