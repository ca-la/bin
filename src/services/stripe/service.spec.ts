import { sandbox, test } from "../../test-helpers/fresh";
import { Test } from "tape";
import { fetchInvoicesFrom } from "./service";
import * as API from "./api";

test("fetchInvoicesFrom", async (t: Test) => {
  const getInvoicesResult = {
    object: "list",
    data: [
      { id: "i1", total: 1, created: 1, subscription: null },
      { id: "i2", total: 1, created: 1, subscription: null },
      { id: "i3", total: 1, created: 1, subscription: null },
    ],
    has_more: true,
  };
  const getInvoicesAfterSpecifiedStub = sandbox()
    .stub(API, "getInvoicesAfterSpecified")
    .resolves(getInvoicesResult)
    .onCall(4)
    .resolves({
      ...getInvoicesResult,
      data: [
        {
          ...getInvoicesResult.data[0],
          id: "latest_id",
        },
        getInvoicesResult.data[1],
      ],
      has_more: false,
    });

  const result = await fetchInvoicesFrom("in_1");
  // 4 calls of getInvoicesAfterSpecified with 3 items
  // 1 call with 2 items returning has_more: false
  t.deepEqual(result.length, 4 * 3 + 2, "loops until has_more: false");
  t.deepEqual(result[0].id, "latest_id", "latest_id goes first");

  getInvoicesAfterSpecifiedStub.resetHistory();

  const result2 = await fetchInvoicesFrom("in_1", { maxIterations: 2 });
  // just 2 calls of getInvoicesAfterSpecified
  t.deepEqual(result2.length, 2 * 3, "loops allowed times");
});
