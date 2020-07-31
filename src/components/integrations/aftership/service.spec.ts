import uuid from "node-uuid";
import { omit } from "lodash";
import { sandbox, test, Test } from "../../../test-helpers/fresh";
import db from "../../../services/db";
import { AFTERSHIP_API_KEY } from "../../../config";
import * as FetchService from "../../../services/fetch";
import * as AftershipTrackingsDAO from "../../aftership-trackings/dao";
import * as ShipmentTrackingEventsDAO from "../../shipment-tracking-events/dao";
import * as ShipmentTrackingsDAO from "../../shipment-trackings/dao";

import Aftership from "./service";
import { AftershipCheckpoint } from "./types";

test("Aftership.createTracking", async (t: Test) => {
  const testDate = new Date(2012, 11, 23);
  sandbox().useFakeTimers(testDate);

  sandbox()
    .stub(FetchService, "fetch")
    .resolves({
      headers: {
        get() {
          return "application/json";
        },
      },
      status: 201,
      async json() {
        return {
          meta: {
            code: 201,
          },
          data: {
            tracking: {
              id: "an-aftership-tracking-id",
              tracking_number: "an-aftership-tracking-number",
              tag: "InTransit",
              shipment_delivery_date: null,
              expected_delivery: null,
              checkpoints: [
                {
                  created_at: testDate.toISOString(),
                  slug: "usps",
                  tag: "InTransit",
                  subtag: "InTransit_001",
                },
              ],
            },
          },
        };
      },
    });
  const createEventsStub = sandbox()
    .stub(ShipmentTrackingEventsDAO, "createAll")
    .resolves();
  const createTrackingStub = sandbox()
    .stub(AftershipTrackingsDAO, "create")
    .returnsArg(1);
  const id = uuid.v4();
  sandbox().stub(uuid, "v4").returns(id);

  const trx = await db.transaction();
  try {
    const tracking = await Aftership.createTracking(trx, {
      approvalStepId: "an-approval-step-id",
      courier: "usps",
      createdAt: new Date(),
      description: null,
      id: "a-shipment-tracking-id",
      trackingId: "a-courier-tracking-id",
    });

    t.deepEqual(
      createTrackingStub.args[0],
      [
        trx,
        {
          id: "an-aftership-tracking-id",
          createdAt: testDate,
          shipmentTrackingId: "a-shipment-tracking-id",
        },
      ],
      "calls AftershipTrackingsDAO.create with the correct data"
    );
    t.deepEqual(createEventsStub.args, [
      [
        trx,
        [
          {
            shipmentTrackingId: "a-shipment-tracking-id",
            id,
            createdAt: testDate,
            courier: "usps",
            tag: "InTransit",
            subtag: "InTransit_001",
            location: null,
            country: null,
            message: null,
            courierTimestamp: null,
            courierTag: null,
          },
        ],
      ],
    ]);
    t.deepEqual(
      tracking,
      {
        id: "an-aftership-tracking-id",
        createdAt: testDate,
        shipmentTrackingId: "a-shipment-tracking-id",
      },
      "returns the created AftershipTracking object"
    );
  } finally {
    await trx.rollback();
  }
});

test("Aftership.getMatchingCouriers", async (t: Test) => {
  const testDate = new Date(2012, 11, 23);
  sandbox().useFakeTimers(testDate);

  const fetchStub = sandbox()
    .stub(FetchService, "fetch")
    .resolves({
      headers: {
        get() {
          return "application/json";
        },
      },
      status: 201,
      async json() {
        return {
          meta: {
            code: 200,
          },
          data: {
            total: 2,
            couriers: [
              {
                slug: "a_courier",
                name: "A Courier",
                additionalField: "something we don't care about",
              },
              {
                slug: "different",
                name: "So Different",
                yetAnotherField: null,
              },
            ],
          },
        };
      },
    });

  const couriers = await Aftership.getMatchingCouriers(
    "a-shipment-tracking-id"
  );

  t.deepEqual(
    couriers,
    [
      { slug: "a_courier", name: "A Courier" },
      { slug: "different", name: "So Different" },
    ],
    "returns couriers in correct format"
  );
  t.deepEqual(
    fetchStub.args,
    [
      [
        "https://api.aftership.com/v4/couriers/detect",
        {
          body: JSON.stringify({
            tracking: { tracking_number: "a-shipment-tracking-id" },
          }),
          headers: {
            "aftership-api-key": AFTERSHIP_API_KEY,
          },
          method: "post",
        },
      ],
    ],
    "calls the correct Aftership endpoint"
  );
});

test("Aftership.getDeliveryStatus", async (t: Test) => {
  const testDate = new Date(2012, 11, 23);
  sandbox().useFakeTimers(testDate);

  const fetchStub = sandbox()
    .stub(FetchService, "fetch")
    .resolves({
      headers: {
        get() {
          return "application/json";
        },
      },
      status: 200,
      async json() {
        return {
          meta: {
            code: 200,
          },
          data: {
            tracking: {
              id: "an-aftership-tracking-id",
              tracking_number: "an-aftership-tracking-number",
              tag: "Delivered",
              expected_delivery: "2012-12-25T12:00:00",
              shipment_delivery_date: "2012-12-26T06:00:00",
              checkpoints: [
                {
                  created_at: testDate.toISOString(),
                  slug: "usps",
                  tag: "InTransit",
                  subtag: "InTransit_001",
                },
              ],
            },
          },
        };
      },
    });

  const deliveryStatus = await Aftership.getDeliveryStatus(
    "a_courier",
    "a-shipment-tracking-id"
  );

  t.deepEqual(
    deliveryStatus,
    {
      tag: "Delivered",
      expectedDelivery: new Date("2012-12-25T12:00:00"),
      deliveryDate: new Date("2012-12-26T06:00:00"),
    },
    "returns the delivery status correctly formatted"
  );

  t.deepEqual(
    fetchStub.args,
    [
      [
        "https://api.aftership.com/v4/trackings/a_courier/a-shipment-tracking-id",
        {
          headers: {
            "aftership-api-key": AFTERSHIP_API_KEY,
          },
          method: "get",
        },
      ],
    ],
    "calls the correct Aftership endpoint"
  );
});

test("Aftership.checkpointToEvent", async (t: Test) => {
  const now = new Date();
  const sparseCheckpoint: AftershipCheckpoint = {
    created_at: now.toISOString(),
    slug: "usps",
    subtag: "Pending_001",
    tag: "Pending",
  };
  const fullCheckpoint: AftershipCheckpoint = {
    ...sparseCheckpoint,
    checkpoint_time: now.toISOString(),
    city: "Atlanta",
    country_iso3: "USA",
    location: "Atlanta, GA, USA",
    message: "Courier has not yet received the package",
    raw_tag: "S0ME_TH1NG",
    state: "GA",
  };

  t.deepEqual(
    omit(
      Aftership.checkpointToEvent("a-shipment-tracking-id", sparseCheckpoint),
      "id"
    ),
    {
      shipmentTrackingId: "a-shipment-tracking-id",
      createdAt: now,
      courier: "usps",
      tag: "Pending",
      subtag: "Pending_001",
      location: null,
      country: null,
      message: null,
      courierTimestamp: null,
      courierTag: null,
    },
    "maps a sparse AftershipCheckpoint object to ShipmentTrackingEvent"
  );

  t.deepEqual(
    omit(
      Aftership.checkpointToEvent("a-shipment-tracking-id", fullCheckpoint),
      "id"
    ),
    {
      shipmentTrackingId: "a-shipment-tracking-id",
      createdAt: now,
      courier: "usps",
      tag: "Pending",
      subtag: "Pending_001",
      location: "Atlanta, GA, USA",
      country: "USA",
      message: "Courier has not yet received the package",
      courierTimestamp: now.toISOString(),
      courierTag: "S0ME_TH1NG",
    },
    "maps a full AftershipCheckpoint object to ShipmentTrackingEvent"
  );
});

test("Aftership.parseWebhookData", async (t: Test) => {
  const id = uuid.v4();
  sandbox().stub(uuid, "v4").returns(id);
  const findTrackingStub = sandbox().stub(
    ShipmentTrackingsDAO,
    "findByAftershipTracking"
  );
  const now = new Date();
  const shipmentTracking = {
    id: "a-shipment-tracking-id",
    approvalStepId: "an-approval-step-id",
    courier: "usps",
    createdAt: now,
    description: "First",
    trackingId: "an-aftership-tracking-number",
  };
  const validBody = {
    msg: {
      id: "an-aftership-tracking-id",
      tracking_number: "an-aftership-tracking-number",
      tag: "Delivered",
      expected_delivery: "2012-12-25T12:00:00",
      shipment_delivery_date: "2012-12-26T06:00:00",
      checkpoints: [
        {
          created_at: now.toISOString(),
          slug: "usps",
          tag: "InTransit",
          subtag: "InTransit_001",
        },
      ],
    },
  };

  const trx = await db.transaction();

  try {
    findTrackingStub.resolves(shipmentTracking);
    t.deepEqual(
      await Aftership.parseWebhookData(trx, validBody),
      {
        events: [
          {
            id,
            shipmentTrackingId: shipmentTracking.id,
            createdAt: now,
            courier: "usps",
            tag: "InTransit",
            subtag: "InTransit_001",
            location: null,
            country: null,
            message: null,
            courierTimestamp: null,
            courierTag: null,
          },
        ],
        shipmentTrackingId: shipmentTracking.id,
      },
      "valid body"
    );

    findTrackingStub.resolves(null);

    try {
      await Aftership.parseWebhookData(trx, validBody);
      t.fail("should not succeed");
    } catch (_) {
      t.pass("fails when no shipment tracking matches");
    }

    try {
      await Aftership.parseWebhookData(trx, { failMe: null });
      t.fail("should not succeed");
    } catch (_) {
      t.pass("fails when validating the body fails");
    }
  } finally {
    await trx.rollback();
  }
});
