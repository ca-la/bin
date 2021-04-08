import { pick } from "lodash";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";
import { authHeader, post } from "../../test-helpers/http";
import UserDevicesDAO from "./dao";

function buildCreateRequest(userId: string, deviceToken: string) {
  return {
    operationName: "create",
    query: `mutation create($blank: UserDeviceInput) {
        CreateUserDevice(data: $blank) {
          id
          userId
          deviceToken
        }
      }`,
    variables: {
      blank: {
        userId,
        deviceToken,
      },
    },
  };
}

test("CreateUserDevice needs authentication", async (t: Test) => {
  const { user } = await createUser({ role: "USER" });

  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildCreateRequest(user.id, "token1"),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(forbiddenBody.errors[0].message, "Unauthorized");
});

test("CreateUserDevice allows creating only own tokens", async (t: Test) => {
  const { user } = await createUser({ role: "USER" });
  const { session: session2 } = await createUser({ role: "USER" });

  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildCreateRequest(user.id, "token1"),
    headers: authHeader(session2.id),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(forbiddenBody.errors[0].message, "Not authorized");
});

test("CreateUserDevice calls UserDevicesDAO.create", async (t: Test) => {
  const { session, user } = await createUser({ role: "USER" });

  const createStubResult = {
    id: "d1",
    userId: user.id,
    deviceToken: "t1",
  };
  const createStub = sandbox()
    .stub(UserDevicesDAO, "create")
    .resolves(createStubResult);

  const findOneStubResult = null;
  const findOneStub = sandbox()
    .stub(UserDevicesDAO, "findOne")
    .resolves(findOneStubResult);

  const [response, body] = await post("/v2", {
    body: buildCreateRequest(user.id, createStubResult.deviceToken),
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(body, {
    data: {
      CreateUserDevice: createStubResult,
    },
  });

  t.deepEqual(findOneStub.args.length, 1, "findOne() called once");
  t.deepEqual(
    pick(createStub.args[0][1], "userId", "deviceToken"),
    pick(createStubResult, "userId", "deviceToken")
  );

  t.deepEqual(createStub.args.length, 1, "create() called once");
  t.deepEqual(
    pick(createStub.args[0][1], "userId", "deviceToken"),
    pick(createStubResult, "userId", "deviceToken")
  );
});

test("CreateUserDevice returns earlier if the token already exists", async (t: Test) => {
  const { session, user } = await createUser({ role: "USER" });

  // posting again with the same device token
  const createStubResult = {
    id: "d1",
    userId: user.id,
    deviceToken: "t1",
  };
  const createStub = sandbox()
    .stub(UserDevicesDAO, "create")
    .resolves(createStubResult);

  // Emulate existing device with existing token
  const findOneStubResult = {
    ...createStubResult,
    id: "d2",
  };
  const findOneStub = sandbox()
    .stub(UserDevicesDAO, "findOne")
    .resolves(findOneStubResult);

  const [response, body] = await post("/v2", {
    body: buildCreateRequest(user.id, createStubResult.deviceToken),
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(body, {
    data: {
      CreateUserDevice: findOneStubResult,
    },
  });

  t.deepEqual(findOneStub.args.length, 1, "findOne() called once");
  t.deepEqual(findOneStub.args[0][1], {
    deviceToken: createStubResult.deviceToken,
  });

  t.deepEqual(createStub.args.length, 0, "create() hasn't been called");
});
