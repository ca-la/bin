"use strict";

const InvalidDataError = require("../../errors/invalid-data");
const Twilio = require("./index");
const { test, skip } = require("../../test-helpers/fresh");

// Replace `skip` with `test` to send real SMS...
skip("Twilio.sendSMS sends SMS messages", async () => {
  return Twilio.sendSMS("+14155809925", "This is a test, this is only a test.");
});

test("Twilio.sendSMS rejects invalid number", async (t) => {
  t.throws(() => {
    Twilio.sendSMS("+1411", "Whoops");
  }, InvalidDataError);
});
