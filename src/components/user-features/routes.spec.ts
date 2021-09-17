import { test, Test, sandbox } from "../../test-helpers/fresh";
import { authHeader, get } from "../../test-helpers/http";

import SessionsDAO from "../../dao/sessions";
import * as UserFeaturesDAO from "./dao";

test("GET /user-features: no features", async (t: Test) => {
  sandbox().stub(SessionsDAO, "findById").resolves({ userId: "a-user-id" });
  const getUserFeaturesStub = sandbox()
    .stub(UserFeaturesDAO, "findNamesByUser")
    .resolves([]);

  const [response, body] = await get("/user-features", {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 200, "returns an OK response");
  t.deepEqual(body, [], "returns empty array");

  t.deepEqual(
    getUserFeaturesStub.args,
    [[getUserFeaturesStub.args[0][0], "a-user-id"]],
    "calls DAO with user ID"
  );
});

test("GET /user-features: with features", async (t: Test) => {
  sandbox().stub(SessionsDAO, "findById").resolves({ userId: "a-user-id" });
  const getUserFeaturesStub = sandbox()
    .stub(UserFeaturesDAO, "findNamesByUser")
    .resolves(["a-feature"]);

  const [response, body] = await get("/user-features", {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 200, "returns an OK response");
  t.deepEqual(body, ["a-feature"], "returns feature names array");

  t.deepEqual(
    getUserFeaturesStub.args,
    [[getUserFeaturesStub.args[0][0], "a-user-id"]],
    "calls DAO with user ID"
  );
});

test("GET /user-features: no auth", async (t: Test) => {
  sandbox().stub(SessionsDAO, "findById").resolves(null);
  const getUserFeaturesStub = sandbox()
    .stub(UserFeaturesDAO, "findNamesByUser")
    .resolves(["a-feature"]);

  const [response] = await get("/user-features", {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 401, "returns an Forbidden response");

  t.deepEqual(getUserFeaturesStub.args, [], "does not call DAO");
});
