import { test, Test } from "../../../test-helpers/simple";

import {
  isCourier,
  fromJson,
  isAftershipTrackingCreateResponse,
} from "./types";

test("isCourier", async (t: Test) => {
  t.true(isCourier("usps"), "with valid Aftership courier slug");
  t.false(isCourier("not a valid courier"), "with invalid courier slug");
});

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
    },
  };
  const invalid = {
    failMe: null,
  };

  t.true(isAftershipTrackingCreateResponse(valid), "with valid input");
  t.false(isAftershipTrackingCreateResponse(invalid), "with invalid input");
});
