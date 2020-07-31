import { test, Test } from "../../../test-helpers/simple";

import { fromJson, isAftershipTrackingCreateResponse } from "./types";

test("fromJson", async (t: Test) => {
  const validCreated = {
    meta: {
      code: 201,
    },
    data: {
      aKey: "a value",
    },
  };

  const validFailure = {
    meta: {
      code: 400,
      type: "BadRequest",
      message: "What a bad request!",
    },
    data: {},
  };

  const invalid = {
    failMe: null,
  };

  t.doesNotThrow(() => fromJson(validCreated), "with valid created response");
  t.doesNotThrow(() => fromJson(validFailure), "with valid failure response");
  t.throws(() => fromJson(invalid), "with invalid response type");
  t.throws(() => fromJson(null), "with null input");
  t.throws(() => fromJson("random text"), "with text input");
});

test("isAftershipTrackingCreateResponse", async (t: Test) => {
  const valid = {
    tracking: {
      id: "an-aftership-tracking-id",
      tracking_number: "a-courier-tracking-id",
    },
  };
  const invalid = {
    failMe: null,
  };

  t.true(isAftershipTrackingCreateResponse(valid), "with valid input");
  t.false(isAftershipTrackingCreateResponse(invalid), "with invalid input");
});
