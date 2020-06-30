import Knex from "knex";
import { sandbox, test, Test } from "../../test-helpers/simple";
import { ShipmentTracking } from "./types";
import Aftership from "../integrations/aftership/service";
import { Courier as AftershipCourier } from "../integrations/aftership/types";

import { listeners } from "./listeners";

function setup() {
  const created: ShipmentTracking = {
    approvalStepId: "an-approval-step-id",
    courier: AftershipCourier.USPS,
    createdAt: new Date(),
    description: null,
    id: "a-shipment-tracking-id",
    trackingId: "a-tracking-id",
  };

  return {
    created,
    stubs: {
      aftershipStub: sandbox().stub(Aftership, "createTracking"),
      trxStub: (sandbox().stub() as unknown) as Knex.Transaction,
    },
  };
}

test("ShipmentTracking listener: dao.created", async (t: Test) => {
  const { created, stubs } = setup();

  await listeners["dao.created"]!({
    domain: "ShipmentTracking",
    type: "dao.created",
    trx: stubs.trxStub,
    created,
  });

  t.deepEqual(
    stubs.aftershipStub.args,
    [[stubs.trxStub, created.courier, created.id]],
    "Creates an Aftership tracking object"
  );
});
