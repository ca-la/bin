import Knex from "knex";
import { sandbox, test, Test } from "../../test-helpers/simple";
import { ShipmentTracking } from "./types";
import Aftership from "../integrations/aftership/service";
import { ShipmentTrackingEvent } from "../shipment-tracking-events/types";
import * as ShipmentTrackingService from "./service";

import { listeners } from "./listeners";

function setup() {
  const created: ShipmentTracking = {
    approvalStepId: "an-approval-step-id",
    courier: "usps",
    createdAt: new Date(2012, 11, 23),
    description: null,
    id: "a-shipment-tracking-id",
    trackingId: "a-tracking-id",
    deliveryDate: null,
    expectedDelivery: null,
  };

  const e1: ShipmentTrackingEvent = {
    country: null,
    courier: "usps",
    courierTag: null,
    courierTimestamp: null,
    createdAt: new Date(2012, 11, 23),
    id: "e1",
    location: null,
    message: null,
    shipmentTrackingId: "a-shipment-tracking-id",
    subtag: "Pending_001",
    tag: "Pending",
  };

  const e2: ShipmentTrackingEvent = {
    ...e1,
    id: "e2",
    subtag: "InTransit_001",
    tag: "InTransit",
    createdAt: new Date(2012, 11, 24),
  };

  return {
    created,
    events: [e1, e2],
    stubs: {
      aftershipStub: sandbox()
        .stub(Aftership, "createTracking")
        .resolves({
          aftershipTracking: {
            id: "an-aftership-tracking-id",
            shipmentTrackingId: "a-shipment-tracking-id",
            createdAt: new Date(2012, 11, 23),
          },
          updates: [
            {
              expectedDelivery: null,
              deliveryDate: null,
              events: [e1, e2],
              shipmentTrackingId: "a-shipment-tracking-id",
            },
          ],
        }),
      handleUpdatesStub: sandbox()
        .stub(ShipmentTrackingService, "handleTrackingUpdates")
        .resolves(),
      trxStub: (sandbox().stub() as unknown) as Knex.Transaction,
    },
  };
}

test("ShipmentTracking listener: dao.created", async (t: Test) => {
  const { created, events, stubs } = setup();

  await listeners["dao.created"]!({
    domain: "ShipmentTracking",
    type: "dao.created",
    trx: stubs.trxStub,
    created,
  });

  t.deepEqual(
    stubs.aftershipStub.args,
    [[stubs.trxStub, created]],
    "creates an Aftership tracking object"
  );

  t.deepEqual(
    stubs.handleUpdatesStub.args,
    [
      [
        stubs.trxStub,
        [
          {
            shipmentTrackingId: "a-shipment-tracking-id",
            expectedDelivery: null,
            deliveryDate: null,
            events,
          },
        ],
      ],
    ],
    "calls updates handler"
  );
});
