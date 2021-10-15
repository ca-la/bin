import uuid from "node-uuid";
import { test, Test } from "../../../test-helpers/fresh";
import createUser from "../../../test-helpers/create-user";
import { authHeader, post } from "../../../test-helpers/http";

function buildRequest(id: string, title: string) {
  return {
    query: `mutation ($team: TeamInput!) {
      createTeam(team: $team) {
        id
        title
      }
    }`,
    variables: {
      team: {
        id,
        title,
      },
    },
  };
}

test("createTeam needs authentication", async (t: Test) => {
  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest("id", "T1"),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(forbiddenBody.errors[0].message, "Unauthorized");
});

test("createTeam returns team", async (t: Test) => {
  const { session } = await createUser();

  const id = uuid.v4();
  const [response, body] = await post("/v2", {
    body: buildRequest(id, "T1"),
    headers: authHeader(session.id),
  });

  t.equal(response.status, 200);
  t.deepEqual(body.data.createTeam, {
    id,
    title: "T1",
  });
});
