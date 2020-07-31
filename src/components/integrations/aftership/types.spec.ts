import { test, Test } from "../../../test-helpers/simple";

import {
  fromJson,
  isAftershipTrackingCreateResponse,
  isAftershipTrackingGetResponse,
  isAftershipCheckpoint,
  isAftershipCourierListResponse,
  isAftershipTracking,
  isAftershipWebhookRequestBody,
  isAftershipTrackingCreateDuplicateResponse,
} from "./types";

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

test("isAftershipCourierListResponse", async (t: Test) => {
  const valid = {
    total: 0,
    couriers: [],
  };
  const invalid = { failMe: null };

  t.true(isAftershipCourierListResponse(valid), "valid");
  t.false(isAftershipCourierListResponse(invalid), "invalid");
});

test("isAftershipCheckpoint", async (t: Test) => {
  const sparse = {
    created_at: new Date().toISOString(),
    slug: "usps",
    tag: "Pending",
    subtag: "Pending_001",
  };
  const full = {
    ...sparse,
    checkpoint_time: "2012-12-23",
    location: "Barcelona, Catalonia",
    city: null,
    state: null,
    country_iso3: "ESP",
    message: "Bon dia",
    raw_tag: "R4W",
  };
  const invalid = {
    failMe: null,
  };
  t.true(isAftershipCheckpoint(sparse), "sparse");
  t.true(isAftershipCheckpoint(full), "full");
  t.false(isAftershipCheckpoint(invalid), "invalid");
});

test("isAftershipTracking", async (t: Test) => {
  const valid = {
    id: "an-aftership-tracking-id",
    tracking_number: "a-courier-tracking-id",
    tag: "Pending",
    expected_delivery: null,
    shipment_delivery_date: null,
    checkpoints: [],
  };
  const invalid = { failMe: null };

  t.true(isAftershipTracking(valid), "valid");
  t.false(isAftershipTracking(invalid), "invalid");
});

test("isAftershipTrackingCreateResponse", async (t: Test) => {
  const valid = {
    tracking: {
      id: "an-aftership-tracking-id",
      tracking_number: "a-courier-tracking-id",
      tag: "Pending",
      shipment_delivery_date: new Date(),
      expected_delivery: null,
      checkpoints: [
        {
          created_at: new Date().toISOString(),
          slug: "usps",
          tag: "Pending",
          subtag: "Pending_001",
        },
      ],
    },
  };
  const invalid = {
    failMe: null,
  };

  t.true(isAftershipTrackingCreateResponse(valid), "with valid input");
  t.false(isAftershipTrackingCreateResponse(invalid), "with invalid input");
});

test("isAftershipTrackingCreateDuplicateResponse", async (t: Test) => {
  const valid = {
    meta: {
      code: 4003,
    },
    data: {
      tracking: {
        id: "an-aftership-tracking-id",
      },
    },
  };
  const invalid = {
    failMe: null,
  };

  t.true(isAftershipTrackingCreateDuplicateResponse(valid), "with valid input");
  t.false(
    isAftershipTrackingCreateDuplicateResponse(invalid),
    "with invalid input"
  );
});

test("isAftershipTrackingGetResponse", async (t: Test) => {
  const valid = {
    tracking: {
      id: "an-aftership-tracking-id",
      tracking_number: "a-courier-tracking-id",
      tag: "Pending",
      shipment_delivery_date: new Date(),
      expected_delivery: null,
      checkpoints: [],
    },
  };
  const invalid = {
    failMe: null,
  };

  t.true(isAftershipTrackingGetResponse(valid), "with valid input");
  t.false(isAftershipTrackingGetResponse(invalid), "with invalid input");
});

test("isAftershipWebhookRequestBody", async (t: Test) => {
  const valid = {
    msg: {
      id: "an-aftership-tracking-id",
      tracking_number: "a-courier-tracking-id",
      tag: "Pending",
      expected_delivery: null,
      shipment_delivery_date: null,
      checkpoints: [
        {
          created_at: new Date().toISOString(),
          slug: "usps",
          tag: "Pending",
          subtag: "Pending_001",
        },
      ],
    },
  };
  const invalid = {
    failMe: null,
  };

  t.true(isAftershipWebhookRequestBody(valid), "valid");
  t.false(isAftershipWebhookRequestBody(invalid), "invalid");
});
