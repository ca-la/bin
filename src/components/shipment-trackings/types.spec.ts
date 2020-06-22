import { test, Test } from "../../test-helpers/simple";
import { isShipmentTrackingRow, ShipmentTrackingRow, Courier } from "./types";

const valid: ShipmentTrackingRow = {
  id: "shipment tracking id",
  approval_step_id: "approval step id",
  courier: Courier.USPS,
  created_at: new Date(),
  description: "a shipment tracking description",
  tracking_id: "aTRACKINGnumber123",
};

const invalid = {
  ...valid,
  courier: "unknown courier",
};

test("isShipmentTrackingRow", async (t: Test) => {
  t.false(isShipmentTrackingRow({}), "empty");
  t.false(isShipmentTrackingRow({ id: "an id" }), "partial");
  t.false(isShipmentTrackingRow(invalid), "invalid");

  t.true(isShipmentTrackingRow(valid), "valid");
  t.true(
    isShipmentTrackingRow({ ...valid, additionalProperty: "additional" }),
    "has additional properties"
  );
});
