import uuid from "node-uuid";

import { create } from "../../dao/addresses";
import Address from "../../domain-objects/address";

import { findById as findUserById } from "../../components/users/dao";
import createUser = require("../create-user");
import User from "../../components/users/domain-object";

const mockAddress: Partial<Address> = {
  companyName: "CALA",
  addressLine1: "42 Wallaby Way",
  addressLine2: "",
  city: "Sydney",
  region: "NSW",
  country: "AU",
  postCode: "RG41 2PE",
};

export default async function generateAddress(
  options: Partial<Address> = {}
): Promise<Address> {
  const { user }: { user: User | null } = options.userId
    ? { user: await findUserById(options.userId) }
    : await createUser({ withSession: false });

  if (!user) {
    throw new Error("Could not get user");
  }

  return create({
    ...mockAddress,
    ...options,
    userId: user.id,
    createdAt: options.createdAt || new Date(),
    deletedAt: options.deletedAt || null,
    id: options.id || uuid.v4(),
  });
}
