import pick from "lodash/pick";
import Knex from "knex";

import AddressesDAO from "./index";
import InvoiceAddressesDAO, { createFromAddress } from "../invoice-addresses";
import { create as createUser } from "../../components/users/dao";
import { test, Test } from "../../test-helpers/fresh";
import generateAddress from "../../test-helpers/factories/address";
import db from "../../services/db";

const USER_DATA = {
  name: "Q User",
  email: "user@example.com",
  password: "hunter2",
  referralCode: "freebie",
};

const ADDRESS_DATA = Object.freeze({
  companyName: "CALA",
  addressLine1: "1025 Oak St",
  addressLine2: "Apt B",
  city: "San Francisco",
  region: "CA",
  postCode: "94117",
  country: "USA",
});

test("AddressesDAO.create creates a new address", async (t: Test) => {
  const user = await createUser(USER_DATA);

  const expectedAddress = Object.assign({}, ADDRESS_DATA, {
    userId: user.id,
  });

  const address = await AddressesDAO.create(expectedAddress);
  const actualAddress = pick(address, Object.keys(expectedAddress));

  t.deepEqual(actualAddress, expectedAddress);
});

test("AddressesDAO.deleteById deletes an address", async (t: Test) => {
  const user = await createUser(USER_DATA);

  const data = Object.assign({}, ADDRESS_DATA, { userId: user.id });

  const address = await AddressesDAO.create(data);
  const deleted = await AddressesDAO.deleteById(address!.id);

  t.notEqual(deleted!.deletedAt, null);
});

test("AddressesDAO.update updates an address", async (t: Test) => {
  const user = await createUser(USER_DATA);

  const data = Object.assign({}, ADDRESS_DATA, { userId: user.id });

  const address = await AddressesDAO.create(data);

  const patch = { postCode: "12345" };
  const expectedAddress = Object.assign({}, ADDRESS_DATA, patch);

  const updated = pick(
    await AddressesDAO.update(address!.id, patch),
    Object.keys(expectedAddress)
  );

  t.deepEqual(updated, expectedAddress);
});

test("AddressesDAO.findByUserId doesn't return duplicates", async (t: Test) => {
  const address = await generateAddress();
  await db.transaction(async (trx: Knex.Transaction) => {
    await createFromAddress(trx, address.id);
    await createFromAddress(trx, address.id);
  });

  const invoiceAddresses = await InvoiceAddressesDAO.findByUserId(
    address.userId
  );
  t.deepEqual(invoiceAddresses.length, 2);

  const addresses = await AddressesDAO.findByUserId(address.userId);
  t.deepEqual(addresses.length, 1);
});
