import { sandbox, test, Test } from "../../../test-helpers/fresh";
import db from "../../../services/db";
import { AFTERSHIP_API_KEY } from "../../../config";
import * as FetchService from "../../../services/fetch";
import * as AftershipTrackingsDAO from "../../aftership-trackings/dao";

import Aftership from "./service";

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
            },
          },
        };
      },
    });
  const createTrackingStub = sandbox()
    .stub(AftershipTrackingsDAO, "create")
    .returnsArg(1);

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
