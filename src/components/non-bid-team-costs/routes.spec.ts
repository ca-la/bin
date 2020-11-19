import uuid from "node-uuid";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import { authHeader, get, post, del } from "../../test-helpers/http";

import SessionsDAO from "../../dao/sessions";
import NonBidTeamCostsDAO from "./dao";
import { Category, NonBidTeamCost } from "./types";
import { Role } from "../users/types";

const jsonify = (x: any) => JSON.parse(JSON.stringify(x));

const now = new Date();

const cost: NonBidTeamCost = {
  id: "a-cost-id",
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  createdBy: "a-user-id",
  teamId: "a-team-id",
  cents: 1234,
  note: "Do website",
  category: Category.WEBSITE_DEVELOPMENT,
};

function setup({
  role = "USER",
}: {
  role?: Role;
} = {}) {
  sandbox().stub(uuid, "v4").returns("a-cost-id");
  return {
    sessionsStub: sandbox().stub(SessionsDAO, "findById").resolves({
      role,
      userId: "a-user-id",
    }),
    findByIdStub: sandbox().stub(NonBidTeamCostsDAO, "findById").resolves(cost),
    findStub: sandbox().stub(NonBidTeamCostsDAO, "find").resolves([cost]),
    createStub: sandbox().stub(NonBidTeamCostsDAO, "create").resolves(cost),
    deleteStub: sandbox().stub(NonBidTeamCostsDAO, "deleteById").resolves(),
  };
}

test("POST /non-bid-team-costs as non-admin", async (t: Test) => {
  const { sessionsStub } = setup();

  const [response] = await post("/non-bid-team-costs", {
    headers: authHeader("a-session-id"),
    body: {
      note: "Do website",
      teamId: "a-team-id",
      cents: 1234,
      category: "WEBSITE_DEVELOPMENT",
    },
  });

  t.equal(response.status, 403, "Does not allow non-admins");

  sessionsStub.resolves(null);

  const [unauthenticated] = await post("/non-bid-team-costs", {
    headers: authHeader("a-session-id"),
    body: {
      note: "Do website",
      teamId: "a-team-id",
      cents: 1234,
      category: "WEBSITE_DEVELOPMENT",
    },
  });

  t.equal(unauthenticated.status, 401, "Does not allow unauthenticated users");
});

test("POST /non-bid-team-costs as admin", async (t: Test) => {
  setup({ role: "ADMIN" });

  const [response, body] = await post("/non-bid-team-costs", {
    headers: authHeader("a-session-id"),
    body: {
      note: "Do website",
      teamId: "a-team-id",
      cents: 1234,
      category: "WEBSITE_DEVELOPMENT",
    },
  });

  t.equal(response.status, 201);
  t.deepEqual(body, JSON.parse(JSON.stringify(cost)), "Creates a cost");

  const [invalid] = await post("/non-bid-team-costs", {
    headers: authHeader("a-session-id"),
    body: {
      foo: "bar",
    },
  });

  t.equal(invalid.status, 400, "Rejects invalid requests");
});

test("GET /non-bid-team-costs as non-admin", async (t: Test) => {
  const { sessionsStub } = setup();

  const [response] = await get("/non-bid-team-costs?teamId=a-team-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 403, "does not allow non-admins");

  sessionsStub.resolves(null);
  const [unauthenticated] = await get("/non-bid-team-costs?teamId=a-team-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(unauthenticated.status, 401, "Does not allow unauthenticated users");
});

test("GET /non-bid-team-costs as admin", async (t: Test) => {
  setup({ role: "ADMIN" });

  const [response, body] = await get("/non-bid-team-costs?teamId=a-team-id", {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 200, "responds successfully");
  t.deepEqual(body, [jsonify(cost)]);

  const [missingQueryParam] = await get("/non-bid-team-costs", {
    headers: authHeader("a-session-id"),
  });
  t.deepEqual(missingQueryParam.status, 400, "Requires the teamId query param");
});

test("DELETE /non-bid-team-costs/:id as non-admin", async (t: Test) => {
  const { sessionsStub } = setup();

  const [response] = await del("/non-bid-team-costs/a-cost-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(response.status, 403, "does not allow non-admins");

  sessionsStub.resolves(null);
  const [unauthenticated] = await del("/non-bid-team-costs/a-cost-id", {
    headers: authHeader("a-session-id"),
  });
  t.equal(unauthenticated.status, 401, "Does not allow unauthenticated users");
});

test("DELETE /non-bid-team-costs/:id as admin", async (t: Test) => {
  setup({ role: "ADMIN" });

  const [response] = await del("/non-bid-team-costs/a-cost-id", {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 204, "responds successfully");
});
