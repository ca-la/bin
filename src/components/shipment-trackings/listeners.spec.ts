import Knex from "knex";
import { sandbox, test, Test } from "../../test-helpers/simple";
import { ShipmentTracking } from "./types";
import * as Aftership from "../integrations/aftership/service";
import { ShipmentTrackingEvent } from "../shipment-tracking-events/types";
import * as IrisService from "../iris/send-message";
import * as ShipmentTrackingService from "./service";

import { listeners } from "./listeners";
import { RealtimeMessageType } from "../iris/types";

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
    courierTimestamp: new Date(2012, 11, 23),
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
    courierTimestamp: new Date(2012, 11, 24),
  };

  return {
    created,
    events: [e1, e2],
    stubs: {
      aftershipCreateStub: sandbox()
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
      aftershipGetStub: sandbox()
        .stub(Aftership, "getTracking")
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
      irisStub: sandbox().stub(IrisService, "sendMessage"),
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
    stubs.aftershipCreateStub.args,
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
  t.true(stubs.irisStub.callCount, "Sends a realtime message");
  t.deepEqual(
    stubs.irisStub.args[0][0],
    {
      type: RealtimeMessageType.shipmentTrackingCreated,
      channels: [`approval-steps/${created.approvalStepId}`],
      resource: {
        ...created,
        deliveryStatus: {
          deliveryDate: null,
          expectedDelivery: null,
          tag: "Pending",
        },
        trackingLink: "https://track.ca.la/a-tracking-id",
      },
    },
    "Message has the correct parts"
  );
});

test("ShipmentTracking listener: dao.updated", async (t: Test) => {
  const { created, stubs } = setup();

  await listeners["dao.updated"]!({
    domain: "ShipmentTracking",
    type: "dao.updated",
    trx: stubs.trxStub,
    updated: created,
    before: created,
  });
  t.true(stubs.irisStub.callCount, "Sends a realtime message");
  t.deepEqual(
    stubs.irisStub.args[0][0],
    {
      type: RealtimeMessageType.shipmentTrackingUpdated,
      channels: [`approval-steps/${created.approvalStepId}`],
      resource: {
        ...created,
        deliveryStatus: {
          deliveryDate: null,
          expectedDelivery: null,
          tag: "Pending",
        },
        trackingLink: "https://track.ca.la/a-tracking-id",
      },
    },
    "Message has the correct parts"
  );
});
