import uuid from "node-uuid";
import { sandbox, test, Test } from "../../../test-helpers/fresh";
import db from "../../../services/db";
import { AFTERSHIP_API_KEY } from "../../../config";
import * as FetchService from "../../../services/fetch";
import * as AftershipTrackingsDAO from "../../aftership-trackings/dao";
import * as ShipmentTrackingEventsDAO from "../../shipment-tracking-events/dao";
import * as ShipmentTrackingsDAO from "../../shipment-trackings/dao";

import * as Aftership from "./service";
import { AftershipTrackingObject } from "./types";
import { ShipmentTracking } from "../../shipment-trackings/types";
import ResourceNotFoundError from "../../../errors/resource-not-found";

function createTrackingSetup() {
  const testDate = new Date(2012, 11, 23);
  sandbox().useFakeTimers(testDate);

  const fetchStub = sandbox().stub(FetchService, "fetch");
  const createEventsStub = sandbox()
    .stub(ShipmentTrackingEventsDAO, "createAll")
    .resolves();
  const createTrackingStub = sandbox()
    .stub(AftershipTrackingsDAO, "create")
    .returnsArg(1);
  const findTrackingStub = sandbox()
    .stub(ShipmentTrackingsDAO, "findByAftershipTracking")
    .resolves([{ id: "a-shipment-tracking-id" }]);
  sandbox().stub(ShipmentTrackingsDAO, "update").resolves();
  const id = uuid.v4();
  sandbox().stub(uuid, "v4").returns(id);

  return {
    testDate,
    fetchStub,
    createEventsStub,
    createTrackingStub,
    id,
    findTrackingStub,
  };
}

test("Aftership.createTracking with new tracking ID", async (t: Test) => {
  const { testDate, fetchStub, createTrackingStub, id } = createTrackingSetup();

  const trx = await db.transaction();
  try {
    fetchStub.resolves({
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

    const { aftershipTracking, updates } = await Aftership.createTracking(trx, {
      approvalStepId: "an-approval-step-id",
      courier: "usps",
      createdAt: new Date(),
      description: null,
      id: "a-shipment-tracking-id",
      trackingId: "a-courier-tracking-id",
      deliveryDate: null,
      expectedDelivery: null,
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

    t.deepEqual(
      aftershipTracking,
      {
        id: "an-aftership-tracking-id",
        createdAt: testDate,
        shipmentTrackingId: "a-shipment-tracking-id",
      },
      "returns the created AftershipTracking object"
    );

    t.deepEqual(
      updates,
      [
        {
          shipmentTrackingId: "a-shipment-tracking-id",
          events: [
            {
              country: null,
              courier: "usps",
              courierTag: null,
              courierTimestamp: null,
              createdAt: testDate,
              id,
              location: null,
              message: null,
              shipmentTrackingId: "a-shipment-tracking-id",
              subtag: "InTransit_001",
              tag: "InTransit",
            },
          ],
          expectedDelivery: null,
          deliveryDate: null,
        },
      ],
      "returns the TrackingUpdates"
    );
  } finally {
    await trx.rollback();
  }
});

test("Aftership.createTracking with duplicate tracking ID", async (t: Test) => {
  const { testDate, fetchStub, createTrackingStub, id } = createTrackingSetup();

  const trx = await db.transaction();
  try {
    fetchStub.onCall(0).resolves({
      headers: {
        get() {
          return "application/json";
        },
      },
      status: 400,
      async json() {
        return {
          meta: {
            code: 4003,
          },
          data: {
            tracking: {
              id: "an-aftership-tracking-id",
            },
          },
        };
      },
    });
    fetchStub.onCall(1).resolves({
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
    const { aftershipTracking, updates } = await Aftership.createTracking(trx, {
      approvalStepId: "an-approval-step-id",
      courier: "usps",
      createdAt: new Date(),
      description: null,
      id: "a-shipment-tracking-id",
      trackingId: "a-courier-tracking-id",
      deliveryDate: null,
      expectedDelivery: null,
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

    t.deepEqual(
      aftershipTracking,
      {
        id: "an-aftership-tracking-id",
        createdAt: testDate,
        shipmentTrackingId: "a-shipment-tracking-id",
      },
      "returns the created AftershipTracking object"
    );

    t.deepEqual(
      updates,
      [
        {
          shipmentTrackingId: "a-shipment-tracking-id",
          events: [
            {
              country: null,
              courier: "usps",
              courierTag: null,
              courierTimestamp: null,
              createdAt: testDate,
              id,
              location: null,
              message: null,
              shipmentTrackingId: "a-shipment-tracking-id",
              subtag: "InTransit_001",
              tag: "InTransit",
            },
          ],
          expectedDelivery: null,
          deliveryDate: null,
        },
      ],
      "returns the TrackingUpdates"
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
    findTrackingStub.resolves([shipmentTracking]);
    t.deepEqual(
      await Aftership.parseWebhookData(trx, validBody),
      [
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
          expectedDelivery: new Date("2012-12-25T12:00:00"),
          deliveryDate: new Date("2012-12-26T06:00:00"),
          shipmentTrackingId: shipmentTracking.id,
        },
      ],
      "valid body"
    );

    findTrackingStub.resolves([]);

    try {
      await Aftership.parseWebhookData(trx, validBody);
      t.fail("should not succeed");
    } catch (err) {
      t.true(
        err instanceof ResourceNotFoundError,
        "uses correct custom error type"
      );
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

test("Aftership.generateTrackingUpdate", async (t: Test) => {
  const testDate = new Date(2012, 11, 23);
  const id = uuid.v4();
  sandbox().stub(uuid, "v4").returns(id);
  const aftershipTracking: AftershipTrackingObject = {
    id: "an-aftership-tracking-id",
    tracking_number: "an-aftership-tracking-number",
    tag: "InTransit",
    shipment_delivery_date: null,
    expected_delivery: "2012-12-24T09:23",
    checkpoints: [
      {
        created_at: testDate.toISOString(),
        slug: "usps",
        tag: "InTransit",
        subtag: "InTransit_001",
      },
    ],
  };
  const shipmentTracking: ShipmentTracking = {
    approvalStepId: "an-approval-step-id",
    courier: "usps",
    createdAt: testDate,
    deliveryDate: null,
    description: "A shipment",
    expectedDelivery: null,
    id: "a-shipment-tracking-id",
    trackingId: "a-courier-tracking-id",
  };

  t.deepEqual(
    Aftership.generateTrackingUpdate(aftershipTracking, shipmentTracking),
    {
      shipmentTrackingId: "a-shipment-tracking-id",
      expectedDelivery: new Date("2012-12-24T09:23"),
      deliveryDate: null,
      events: [
        {
          country: null,
          courier: "usps",
          courierTag: null,
          courierTimestamp: null,
          createdAt: testDate,
          id,
          location: null,
          message: null,
          shipmentTrackingId: "a-shipment-tracking-id",
          subtag: "InTransit_001",
          tag: "InTransit",
        },
      ],
    }
  );
});
