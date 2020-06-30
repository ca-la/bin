import { sandbox, test, Test } from "../../../test-helpers/fresh";
import db from "../../../services/db";
import * as FetchService from "../../../services/fetch";
import * as AftershipTrackingsDAO from "../../aftership-trackings/dao";

import Aftership from "./service";
import * as AftershipTypes from "./types";

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
            },
          },
        };
      },
    });
  sandbox().stub(AftershipTypes, "isCourier").returns(true);
  const createTrackingStub = sandbox()
    .stub(AftershipTrackingsDAO, "create")
    .returnsArg(1);

  const trx = await db.transaction();
  try {
    const tracking = await Aftership.createTracking(
      trx,
      "a valid courier",
      "a-shipment-tracking-id"
    );

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
