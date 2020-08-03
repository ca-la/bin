import { test, Test } from "../../test-helpers/simple";
import { isShipmentTrackingRow, ShipmentTrackingRow } from "./types";

const valid: ShipmentTrackingRow = {
  id: "shipment tracking id",
  approval_step_id: "approval step id",
  courier: "some cool courier",
  created_at: new Date(),
  description: "a shipment tracking description",
  tracking_id: "aTRACKINGnumber123",
  delivery_date: null,
  expected_delivery: null,
};

const invalid = {
  id: "shipment tracking id",
  approval_step_id: "approval step id",
  created_at: new Date(),
  description: "a shipment tracking description",
  tracking_id: "aTRACKINGnumber123",
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
