"use strict";

const { test } = require("../../test-helpers/fresh");
const validateMeasurements = require("./index");
const InvalidDataError = require("../../errors/invalid-data");

test("validateMeasurements allows valid values", async () => {
  const values = [null, {}, { heightInches: 10 }, { weightLbs: 100 }];

  values.map(validateMeasurements);
});

test("validateMeasurements disallows invalid values", async (t) => {
  t.throws(() => {
    validateMeasurements({
      heightInches: "very",
    });
  }, InvalidDataError);

  t.throws(() => {
    validateMeasurements({
      weightLbs: 9999,
    });
  }, InvalidDataError);
});
