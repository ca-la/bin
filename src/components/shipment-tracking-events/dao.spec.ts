import Knex from "knex";
import uuid from "node-uuid";
import { sandbox, test, Test } from "../../test-helpers/fresh";

import createUser from "../../test-helpers/create-user";
import { staticProductDesign } from "../../test-helpers/factories/product-design";
import db from "../../services/db";
import createDesign from "../../services/create-design";
import ApprovalStepsDAO from "../approval-steps/dao";
import { ApprovalStepType } from "../approval-steps/types";
import ShipmentTrackingsDAO from "../shipment-trackings/dao";
import Aftership from "../integrations/aftership/service";

import ShipmentTrackingEventsDAO from "./dao";
import { ShipmentTrackingEvent } from "./types";

async function setup(trx: Knex.Transaction) {
  const { user } = await createUser({ withSession: false });

  const d1 = await createDesign(
    staticProductDesign({ id: "d1", userId: user.id }),
    trx
  );
  const checkoutStep = await ApprovalStepsDAO.findOne(trx, {
    designId: d1.id,
    type: ApprovalStepType.CHECKOUT,
  });

  if (!checkoutStep) {
    throw new Error("Could not find checkout step for created design");
  }

  sandbox().stub(Aftership, "createTracking").resolves({
    aftershipTracking: {},
    updates: [],
  });

  const shipmentTracking = await ShipmentTrackingsDAO.create(trx, {
    approvalStepId: checkoutStep.id,
    courier: "usps",
    createdAt: new Date(2012, 11, 23),
    description: "First",
    id: uuid.v4(),
    trackingId: "first-tracking-id",
    deliveryDate: null,
    expectedDelivery: null,
  });

  return {
    shipmentTracking,
  };
}

test("ShipmentTrackingEventsDAO.findLatestByShipmentTracking", async (t: Test) => {
  const trx = await db.transaction();

  try {
    const { shipmentTracking } = await setup(trx);
    const events: ShipmentTrackingEvent[] = [
      {
        country: null,
        courier: "usps",
        courierTag: null,
        courierTimestamp: null,
        createdAt: new Date(2012, 11, 23),
        id: uuid.v4(),
        location: null,
        message: null,
        shipmentTrackingId: shipmentTracking.id,
        subtag: "Pending_001",
        tag: "Pending",
      },
      {
        country: null,
        courier: "usps",
        courierTag: null,
        courierTimestamp: null,
        createdAt: new Date(2012, 11, 24),
        id: uuid.v4(),
        location: null,
        message: null,
        shipmentTrackingId: shipmentTracking.id,
        subtag: "InTransit_001",
        tag: "InTransit",
      },
    ];

    await ShipmentTrackingEventsDAO.createAll(trx, events);

    const latest = await ShipmentTrackingEventsDAO.findLatestByShipmentTracking(
      trx,
      shipmentTracking.id
    );

    t.deepEqual(latest, events[1], "Returns latest event");
  } finally {
    await trx.rollback();
  }
});

test("ShipmentTrackingEventsDAO.findLatestByShipmentTracking with no events", async (t: Test) => {
  const trx = await db.transaction();

  try {
    const { shipmentTracking } = await setup(trx);
    const latest = await ShipmentTrackingEventsDAO.findLatestByShipmentTracking(
      trx,
      shipmentTracking.id
    );

    t.deepEqual(latest, null, "Returns null");
  } finally {
    await trx.rollback();
  }
});
