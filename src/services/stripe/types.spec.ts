import { test } from "../../test-helpers/fresh";
import { Test } from "tape";
import { invoiceSchema } from "./types";

test("invoiceSchema", async (t: Test) => {
  t.equal(
    invoiceSchema.safeParse({
      id: "",
      total: -1,
      subscription: null,
      created: 1,
    }).success,
    false,
    "total can't be negative"
  );

  t.equal(
    invoiceSchema.safeParse({
      id: "",
      total: 1,
      subscription: null,
      created: 1,
    }).success,
    true,
    "total can be positive"
  );

  t.equal(
    invoiceSchema.safeParse({
      id: "",
      total: 0,
      subscription: null,
      created: 1,
    }).success,
    true,
    "total can be zero"
  );
});