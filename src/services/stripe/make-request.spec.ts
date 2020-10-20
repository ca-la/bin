import { sandbox, test, Test } from "../../test-helpers/fresh";
import makeRequest from "./make-request";
import * as GetFetcher from "../get-fetcher";

test("makeRequest POST with idempotency key", async (t: Test) => {
  const fetchStub = sandbox()
    .mock()
    .returns(async () => [200, {}]);
  sandbox().stub(GetFetcher, "getFetcher").returns(fetchStub);

  makeRequest({
    data: { hello: "world" },
    idempotencyKey: "key",
    additionalHeaders: {
      addedHeader: "ah",
    },
    method: "post",
    apiBase: "example.com",
    path: "example",
  });

  t.deepEqual(fetchStub.args, [
    [
      {
        data: { hello: "world" },
        idempotencyKey: "key",
        additionalHeaders: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Idempotency-Key": "key",
          addedHeader: "ah",
        },
        method: "post",
        apiBase: "example.com",
        path: "example",
      },
    ],
  ]);
});
