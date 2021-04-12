import { sandbox, test } from "../../test-helpers/fresh";
import { Test } from "tape";
import { getInvoicesAfterSpecified } from "./api";
import * as MakeRequest from "./make-request";

test("getInvoicesAfterSpecified", async (t: Test) => {
  const correctResult = {
    object: "list",
    data: [],
    has_more: false,
  };
  const makeRequestStub = sandbox()
    .stub(MakeRequest, "default")
    .resolves(correctResult);

  const result = await getInvoicesAfterSpecified("in_1");
  t.deepEqual(result, correctResult, "Returns correct result");

  t.deepEqual(
    makeRequestStub.args,
    [
      [
        {
          method: "get",
          path: "/invoices?ending_before=in_1&limit=100",
        },
      ],
    ],
    "Calls makeRequest with correct arguments"
  );

  makeRequestStub.resolves({
    ...correctResult,
    object: "not_list",
  });

  try {
    await getInvoicesAfterSpecified("in_1");
    t.fail("Expected an error if the returned result mismatch expected schema");
  } catch (err) {
    t.pass("Throws an error if the returned result mismatch expected schema");
  }
});
