import tape from "tape";
import uuid from "node-uuid";

import { sandbox, test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";
import API from "../../test-helpers/http";
import generateResolveAccount from "../../test-helpers/factories/resolve-account";
import * as NodeFetch from "../../services/fetch";
import { encodeRawResolveData } from "./resolve";

const resolveResponseData = {
  approved_at: "2019-03-25T22:50:16.984Z",
  amount_available: 100000,
  amount_balance: 0,
  business_name: "Test Buyer account",
  approved: true,
  amount_approved: 100000,
};

const fetchResponse = {
  json: (): Promise<object> => Promise.resolve(resolveResponseData),
  status: 200,
};

const malformedResponse = {
  json: (): Promise<object> => Promise.resolve({ foo: "bar" }),
  status: 204,
};

test("GET /resolve-accounts?userId= returns all accounts for that user", async (t: tape.Test) => {
  const { session, user } = await createUser();
  const fetchStub = sandbox().stub(NodeFetch, "fetch").resolves(fetchResponse);
  const { account: a1 } = await generateResolveAccount({ userId: user.id });
  const { account: a2 } = await generateResolveAccount({ userId: user.id });

  const [getResponse, getBody] = await API.get(
    `/resolve-accounts?userId=${user.id}`,
    {
      headers: API.authHeader(session.id),
    }
  );
  t.equal(getResponse.status, 200, "GET returns a 200 status");
  t.equal(fetchStub.calledTwice, true, "Resolve API was fetched 2 times");
  t.deepEqual(
    [
      { ...getBody[0], approvedAt: new Date(getBody[0].approvedAt) },
      { ...getBody[1], approvedAt: new Date(getBody[1].approvedAt) },
    ],
    [
      encodeRawResolveData(resolveResponseData, a1, 0),
      encodeRawResolveData(resolveResponseData, a2, 0),
    ],
    "Successfully returns all accounts"
  );
  const [badResponse] = await API.get(`/resolve-accounts?userId=${uuid.v4()}`, {
    headers: API.authHeader(session.id),
  });
  t.equal(
    badResponse.status,
    403,
    "GET returns 403 where user is not authorized"
  );
  const [badQueryResponse] = await API.get("/resolve-accounts", {
    headers: API.authHeader(session.id),
  });
  t.equal(badQueryResponse.status, 400, "GET returns 400 when no query params");

  fetchStub.resolves(malformedResponse);
  const [malformed] = await API.get(`/resolve-accounts?userId=${user.id}`, {
    headers: API.authHeader(session.id),
  });
  t.equal(
    malformed.status,
    500,
    "GET returns 500 when the response from resolve is not understood"
  );
});

test("POST /resolve-accounts creates a new account with the user and resolve customer id", async (t: tape.Test) => {
  const { session, user } = await createUser({ role: "ADMIN" });
  const resolveCustomerId = "test123";
  const fetchStub = sandbox().stub(NodeFetch, "fetch").resolves(fetchResponse);

  const [getResponse, getBody] = await API.post("/resolve-accounts", {
    body: {
      resolveCustomerId,
      userId: user.id,
    },
    headers: API.authHeader(session.id),
  });
  t.equal(getResponse.status, 201, "POST returns a 201 status");
  t.true(fetchStub.calledOnce, "resolve integration was called");
  t.deepEqual(
    getBody.userId,
    user.id,
    "Successfully creates account with correct userId"
  );
  t.deepEqual(
    getBody.resolveCustomerId,
    resolveCustomerId,
    "Successfully creates account with correct resolve customer id"
  );
});

test("POST /resolve-accounts fails to create a new account with invalid resolve customer id", async (t: tape.Test) => {
  const { session, user } = await createUser({ role: "ADMIN" });
  const resolveCustomerId = "test123";
  const fetchStub = sandbox()
    .stub(NodeFetch, "fetch")
    .resolves({ ...fetchResponse, status: 404 });

  const [getResponse] = await API.post("/resolve-accounts", {
    body: {
      resolveCustomerId,
      userId: user.id,
    },
    headers: API.authHeader(session.id),
  });
  t.equal(getResponse.status, 404, "POST returns a 404 status");
  t.true(fetchStub.calledOnce, "resolve integration was called");
});

test("POST /resolve-accounts fails to create a new account with resolve down", async (t: tape.Test) => {
  const { session, user } = await createUser({ role: "ADMIN" });
  const resolveCustomerId = "test123";
  const fetchStub = sandbox()
    .stub(NodeFetch, "fetch")
    .resolves({ ...fetchResponse, status: 500 });

  const [getResponse] = await API.post("/resolve-accounts", {
    body: {
      resolveCustomerId,
      userId: user.id,
    },
    headers: API.authHeader(session.id),
  });
  t.equal(getResponse.status, 500, "POST returns a 500 status");
  t.true(fetchStub.calledOnce, "resolve integration was called");
});
