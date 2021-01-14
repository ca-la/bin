import { test, Test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";
import { post } from "../../test-helpers/http";

test("login(id) will not work for credentials that do not exist", async (t: Test) => {
  const { user } = await createUser({ role: "USER", withSession: false });

  const graphRequest = {
    operationName: null,
    query: `mutation {
      login(email: "${user.email}" password: "blahblahblah") {
        userId
        role
      }
    }`,
    variables: {},
  };

  const [response, body] = await post("/v2", {
    body: graphRequest,
  });

  t.equal(response.status, 200);
  t.true(body.errors[0].message.includes("Something went wrong!"));

  const graphRequest2 = {
    operationName: null,
    query: `mutation {
      login(email: "blahblah@ca.la" password: "blahblahblah") {
        userId
        role
      }
    }`,
    variables: {},
  };

  const [response2, body2] = await post("/v2", {
    body: graphRequest2,
  });

  t.equal(response2.status, 200);
  t.true(body2.errors[0].message.includes("Something went wrong!"));
});

test("login(id) can return a user", async (t: Test) => {
  const { user } = await createUser({ role: "ADMIN", withSession: false });

  const [response, body] = await post("/v2", {
    body: {
      operationName: null,
      query: `mutation {
        login(email: "${user.email}" password: "hunter2") {
          userId
          role
          expiresAt
          user {
            email
          }
        }
      }`,
      variables: {},
    },
  });

  t.equal(response.status, 200);
  t.deepEqual(body.data.login, {
    role: "ADMIN",
    userId: user.id,
    expiresAt: null,
    user: {
      email: user.email,
    },
  });
});
