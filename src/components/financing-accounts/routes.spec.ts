import uuid from "node-uuid";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import { authHeader, post, get } from "../../test-helpers/http";
import createUser from "../../test-helpers/create-user";
import { generateTeam } from "../../test-helpers/factories/team";
import SessionsDAO from "../../dao/sessions";

import { rawDao } from "./dao";

test("POST /financing-accounts", async (t: Test) => {
  const testDate = new Date(2012, 11, 23);
  sandbox().useFakeTimers(testDate);
  sandbox().stub(uuid, "v4").returns("a-financing-account-id");
  const valid = {
    teamId: "a-team-id",
    termLengthDays: 30,
    feeBasisPoints: 10_00,
    creditLimitCents: 100_000_00,
  };
  const sessionStub = sandbox()
    .stub(SessionsDAO, "findById")
    .resolves({ role: "ADMIN", userId: "a-user-id" });
  const createStub = sandbox()
    .stub(rawDao, "create")
    .resolves({
      ...valid,
      id: "a-financing-account-id",
      createdAt: testDate,
      closedAt: null,
    });

  const [response, body] = await post("/financing-accounts", {
    headers: authHeader("a-session-id"),
    body: valid,
  });

  t.equal(response.status, 201, "responds with created response");
  t.deepEqual(
    body,
    JSON.parse(
      JSON.stringify({
        ...valid,
        id: "a-financing-account-id",
        createdAt: testDate,
        closedAt: null,
      })
    ),
    "responds with the created account"
  );
  t.deepEqual(
    createStub.args[0].slice(1),
    [
      {
        ...valid,
        id: "a-financing-account-id",
        createdAt: testDate,
        closedAt: null,
      },
    ],
    "calls the create DAO method with the request body"
  );

  sessionStub.resolves(null);
  const [notAuthed] = await post("/financing-accounts", {
    headers: authHeader("a-session-id"),
    body: valid,
  });

  t.equal(notAuthed.status, 401, "responds with unauthorized response");

  sessionStub.resolves({
    role: "USER",
    userId: "a-user-id",
  });
  const [notAdmin] = await post("/financing-accounts", {
    headers: authHeader("a-session-id"),
    body: valid,
  });

  t.equal(notAdmin.status, 403, "responds with forbidden response");

  sessionStub.resolves({
    role: "ADMIN",
    userId: "a-user-id",
  });
  const [notValid] = await post("/financing-accounts", {
    headers: authHeader("a-session-id"),
    body: {
      foo: "not a valid property",
    },
  });

  t.equal(notValid.status, 400, "responds with invalid response");
});

test("GET /financing-accounts?teamId", async (t: Test) => {
  const testDate = new Date(2012, 11, 23);
  sandbox().useFakeTimers(testDate);
  const sessionStub = sandbox()
    .stub(SessionsDAO, "findById")
    .resolves({ role: "ADMIN", userId: "a-user-id" });
  const findStub = sandbox()
    .stub(rawDao, "find")
    .resolves([
      {
        id: "a-financing-account-id",
        createdAt: testDate,
        closedAt: null,
        teamId: "a-team-id",
        termLengthDays: 30,
        feeBasisPoints: 10_00,
        creditLimitCents: 100_000_00,
      },
    ]);

  const [response, body] = await get("/financing-accounts?teamId=a-team-id", {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 200, "responds with a success response");
  t.deepEqual(
    body,
    [
      {
        id: "a-financing-account-id",
        createdAt: testDate.toISOString(),
        closedAt: null,
        teamId: "a-team-id",
        termLengthDays: 30,
        feeBasisPoints: 10_00,
        creditLimitCents: 100_000_00,
      },
    ],
    "responds with all found accounts by team"
  );
  t.deepEqual(
    findStub.args[0].slice(1),
    [{ teamId: "a-team-id" }],
    "calls find dao method with correct filter"
  );

  sessionStub.resolves(null);
  const [notAuthed] = await get("/financing-accounts?teamId=a-team-id", {
    headers: authHeader("a-session-id"),
  });

  t.equal(notAuthed.status, 401, "responds with unauthorized response");

  sessionStub.resolves({
    role: "USER",
    userId: "a-user-id",
  });
  const [notAdmin] = await post("/financing-accounts?teamId=a-team-id", {
    headers: authHeader("a-session-id"),
  });

  t.equal(notAdmin.status, 403, "responds with forbidden response");

  sessionStub.resolves({
    role: "ADMIN",
    userId: "a-user-id",
  });
  const [notValid] = await post("/financing-accounts?foo=bar", {
    headers: authHeader("a-session-id"),
  });

  t.equal(notValid.status, 400, "responds with invalid response");
});

test("GET -> POST -> GET: end to end", async (t: Test) => {
  const admin = await createUser({ role: "ADMIN" });
  const designer = await createUser();
  const { team } = await generateTeam(designer.user.id);

  const [, empty] = await get(`/financing-accounts?teamId=${team.id}`, {
    headers: authHeader(admin.session.id),
  });

  t.deepEqual(empty, [], "no accounts to start with");

  const [, created] = await post("/financing-accounts", {
    headers: authHeader(admin.session.id),
    body: {
      teamId: team.id,
      termLengthDays: 30,
      feeBasisPoints: 10_00,
      creditLimitCents: 100_000_00,
    },
  });
  const [, found] = await get(`/financing-accounts?teamId=${team.id}`, {
    headers: authHeader(admin.session.id),
  });

  t.deepEqual(found, [created], "finds the created account");
});
