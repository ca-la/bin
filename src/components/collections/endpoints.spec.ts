import { test, Test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";
import { authHeader, post } from "../../test-helpers/http";
import generateCollection from "../../test-helpers/factories/collection";

function buildRequest(userId: string, offset?: number, limit?: number) {
  return {
    query: `query ($filter: CollectionFilter!, $offset: Int, $limit: Int) {
      collections(filter: $filter, offset: $offset, limit: $limit) {
        id
      }
    }`,
    variables: {
      filter: { userId },
      limit,
      offset,
    },
  };
}

test("collections needs authentication", async (t: Test) => {
  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest("u1"),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(forbiddenBody.errors[0].message, "Unauthorized");
});

test("collections is forbidden for another user", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { session } = await createUser();

  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest(user.id),
    headers: authHeader(session.id),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(
    forbiddenBody.errors[0].message,
    "Cannot access collections for this user"
  );
});

test("collections returns shared collections, respects limit and offset", async (t: Test) => {
  const { session, user } = await createUser();

  await generateCollection({ createdBy: user.id });
  const { collection: c2 } = await generateCollection({ createdBy: user.id });
  const { collection: c3 } = await generateCollection({ createdBy: user.id });
  await generateCollection({ createdBy: user.id });

  // arbitrary user collection, should not appear
  await generateCollection();

  const [response, body] = await post("/v2", {
    body: buildRequest(user.id, 1, 2),
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(body, {
    data: {
      collections: [
        // collections are sorted in reverse order by default
        { id: c3.id },
        { id: c2.id },
      ],
    },
  });
});
