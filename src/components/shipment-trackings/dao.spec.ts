import Knex from "knex";
import uuid from "node-uuid";
import { sandbox, test, Test } from "../../test-helpers/fresh";

import createUser from "../../test-helpers/create-user";
import { staticProductDesign } from "../../test-helpers/factories/product-design";
import db from "../../services/db";
import createDesign from "../../services/create-design";
import ApprovalStepsDAO from "../approval-steps/dao";
import AftershipTrackingsDAO from "../aftership-trackings/dao";
import { ApprovalStepType } from "../approval-steps/types";
import Aftership from "../integrations/aftership/service";

import ShipmentTrackingsDAO from "./dao";

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

  sandbox().stub(Aftership, "createTracking").resolves();

  const shipmentTrackings = await Promise.all([
    ShipmentTrackingsDAO.create(trx, {
      approvalStepId: checkoutStep.id,
      courier: "usps",
      createdAt: new Date(2012, 11, 23),
      description: "First",
      id: uuid.v4(),
      trackingId: "first-tracking-id",
    }),
    ShipmentTrackingsDAO.create(trx, {
      approvalStepId: checkoutStep.id,
      courier: "usps",
      createdAt: new Date(2012, 11, 24),
      description: "First (duplicate)",
      id: uuid.v4(),
      trackingId: "first-tracking-id",
    }),
  ]);

  const aftershipTrackings = await Promise.all([
    AftershipTrackingsDAO.create(trx, {
      createdAt: new Date(2012, 11, 23),
      id: "aftership-id",
      shipmentTrackingId: shipmentTrackings[0].id,
    }),
    AftershipTrackingsDAO.create(trx, {
      createdAt: new Date(2012, 11, 23),
      id: "aftership-id",
      shipmentTrackingId: shipmentTrackings[1].id,
    }),
  ]);

  const otherTracking = await ShipmentTrackingsDAO.create(trx, {
    approvalStepId: checkoutStep.id,
    courier: "usps",
    createdAt: new Date(2012, 11, 23),
    description: "Other",
    id: uuid.v4(),
    trackingId: "other-tracking-id",
  });
  await AftershipTrackingsDAO.create(trx, {
    createdAt: new Date(2012, 11, 23),
    id: "different-aftership-id",
    shipmentTrackingId: otherTracking.id,
  });

  return {
    shipmentTrackings,
    aftershipTrackings,
  };
}

test("ShipmentTrackingsDAO.findByAftershipTracking", async (t: Test) => {
  const trx = await db.transaction();

  try {
    const { shipmentTrackings } = await setup(trx);

    const found = await ShipmentTrackingsDAO.findByAftershipTracking(
      trx,
      "aftership-id"
    );

    t.deepEqual(
      found,
      shipmentTrackings,
      "Returns the matching shipment tracking rows"
    );

    const notFound = await ShipmentTrackingsDAO.findByAftershipTracking(
      trx,
      "not-found-id"
    );

    t.deepEqual(notFound, [], "Returns empty on a miss");
  } finally {
    await trx.rollback();
  }
});
