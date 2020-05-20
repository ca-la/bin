"use strict";

const random = require("lodash/random");

const { test, sandbox, skip } = require("../../test-helpers/fresh");
const ShopifyClient = require("./index");

// Run these tests with RUN_SHOPIFY_TESTS=true to run the integration tests
// against a real Shopify store.
const testLive = process.env.RUN_SHOPIFY_TESTS === "true" ? test : skip;
const liveClient = new ShopifyClient(ShopifyClient.CALA_STORE_CREDENTIALS);

function getPhone() {
  let memo = "+1415580";
  for (let i = 0; i < 4; i += 1) {
    memo += random(0, 9);
  }
  return memo;
}

const phone1 = getPhone();

testLive("createCustomer", async (t) => {
  const customer = await liveClient.createCustomer({
    name: "Customer Name",
    phone: phone1,
  });

  t.equal(customer.first_name, "Customer");
  t.equal(customer.last_name, "Name");
  t.equal(customer.phone, phone1);
});

test("parseError parses string errors", async (t) => {
  const errorMessage = ShopifyClient.parseError("wowza");
  t.equal(errorMessage, "wowza");
});

test("parseError parses object errors", async (t) => {
  const errorMessage = ShopifyClient.parseError({
    phone: ["is invalid", "is very bad"],
    name: ["also bad", "not good"],
  });

  t.equal(
    errorMessage,
    "phone is invalid, phone is very bad, name also bad, name not good"
  );
});

test("parseError parses object errors", async (t) => {
  const errorMessage = ShopifyClient.parseError({
    phone: "no bueno",
  });

  t.equal(errorMessage, "phone no bueno");
});

test("getCustomerMetafields includes high limit in URL", async (t) => {
  const requestStub = sandbox()
    .stub(ShopifyClient.prototype, "makeRequest")
    .returns(Promise.resolve([{}, {}]));

  const client = new ShopifyClient(ShopifyClient.CALA_STORE_CREDENTIALS);

  await client.getCustomerMetafields("customer123");
  t.equal(requestStub.callCount, 1);
  t.deepEqual(requestStub.firstCall.args, [
    "get",
    "/customers/customer123/metafields.json?limit=250",
  ]);
});
