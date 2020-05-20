import { test } from "../../../test-helpers/fresh";
import createUser = require("../../../test-helpers/create-user");
import tape = require("tape");
import { validatePassword } from "./validate-password";
import uuid = require("node-uuid");

test("accepts a matching password", async (t: tape.Test) => {
  const { user } = await createUser();
  t.true(await validatePassword(user.id, "hunter2"));
});

test("rejects a wrong password", async (t: tape.Test) => {
  const { user } = await createUser();
  t.false(await validatePassword(user.id, "not-correct"));
});

test("fails on invalid user", async (t: tape.Test) => {
  const id = uuid.v4();
  t.false(await validatePassword(id, "does not exist"));
});
