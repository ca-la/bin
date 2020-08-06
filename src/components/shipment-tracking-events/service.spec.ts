import { sandbox, test, Test } from "../../test-helpers/fresh";
import db from "../../services/db";

import * as ShipmentTrackingEventsDAO from "./dao";
import * as ShipmentTrackingEventService from "./service";
import { ShipmentTrackingEvent } from "./types";

const e1: ShipmentTrackingEvent = {
  createdAt: new Date(2012, 11, 23),
  country: null,
  courier: "usps",
  courierTag: null,
  courierTimestamp: new Date(2012, 11, 23),
  id: "e1",
  location: null,
  message: null,
  shipmentTrackingId: "a-shipment-tracking-id",
  subtag: "Pending_001",
  tag: "Pending",
};
const e2: ShipmentTrackingEvent = {
  ...e1,
  courierTimestamp: new Date(2012, 11, 24),
  id: "e2",
  subtag: "InTransit_001",
  tag: "InTransit",
};

const e3: ShipmentTrackingEvent = {
  ...e1,
  courierTimestamp: new Date(2012, 11, 26),
  id: "e3",
  subtag: "Delivered_001",
  tag: "Delivered",
};

test("ShipmentTrackingEventService.diff", async (t: Test) => {
  const trx = await db.transaction();
  const findStub = sandbox().stub(ShipmentTrackingEventsDAO, "find");
  try {
    findStub.resolves([]);

    t.deepEqual(
      await ShipmentTrackingEventService.diff(trx, "a-shipment-tracking-id", [
        e1,
        e2,
        e3,
      ]),
      [e1, e2, e3]
    );

    findStub.resolves([e1]);
    t.deepEqual(
      await ShipmentTrackingEventService.diff(trx, "a-shipment-tracking-id", [
        e1,
        e2,
        e3,
      ]),
      [e2, e3]
    );

    findStub.resolves([e1, e2, e3]);
    t.deepEqual(
      await ShipmentTrackingEventService.diff(trx, "a-shipment-tracking-id", [
        e1,
        e2,
        e3,
      ]),
      []
    );
  } finally {
    await trx.rollback();
  }
});
