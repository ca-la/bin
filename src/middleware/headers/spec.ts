import { test, Test } from "../../test-helpers/fresh";
import { get, options } from "../../test-helpers/http";

test("CORS middleware allows all requested headers", async (t: Test) => {
  const [response] = await options("/", {
    headers: {
      "access-control-request-headers": "Authorization, X-CALA-client-id",
    },
  });

  t.equal(response.status, 204);
  t.equal(
    response.headers.get("access-control-allow-headers"),
    "Authorization, X-CALA-client-id"
  );

  const [response2] = await options("/");
  t.equal(response2.status, 204);
  t.equal(
    response2.headers.get("access-control-allow-headers"),
    "Authorization"
  );
});

test("CORS middleware returns max age", async (t: Test) => {
  const [response] = await options("/");
  t.equal(response.headers.get("access-control-max-age"), "86400");
});

test("header middleware returns cache control", async (t: Test) => {
  const [response] = await get("/");

  t.equal(response.status, 200);
  t.equal(response.headers.get("cache-control"), "no-cache");
});
