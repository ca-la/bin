import { test, Test } from "../../../test-helpers/fresh";
import createUser from "../../../test-helpers/create-user";
import { authHeader, post } from "../../../test-helpers/http";
import { generateTeam } from "../../../test-helpers/factories/team";

function buildRequest(userId: string, offset?: number, limit?: number) {
  return {
    query: `query ($filter: TeamFilter!, $offset: Int, $limit: Int) {
      FindTeams(filter: $filter, offset: $offset, limit: $limit) {
        list {
          id
        }
        meta {
          total
        }
      }
    }`,
    variables: {
      filter: { userId },
      limit,
      offset,
    },
  };
}

test("FindTeams needs authentication", async (t: Test) => {
  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest("d1"),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(forbiddenBody.errors[0].message, "Unauthorized");
});

test("FindTeams is forbidden for another user", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { session } = await createUser();

  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest(user.id),
    headers: authHeader(session.id),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(forbiddenBody.errors[0].message, "Cannot access teams for this user");
});

test("FindTeams returns user teams", async (t: Test) => {
  const { session, user } = await createUser();
  const { team: team1 } = await generateTeam(user.id);
  const { team: team2 } = await generateTeam(user.id);

  const [response, body] = await post("/v2", {
    body: buildRequest(user.id),
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(body, {
    data: {
      FindTeams: {
        list: [
          // teams are sorted in reverse order by default
          { id: team2.id },
          { id: team1.id },
        ],
        meta: {
          total: 2,
        },
      },
    },
  });
});

test("FindTeams respects limit and offset", async (t: Test) => {
  const { session, user } = await createUser();

  // first team goes last and gonna be skipped due to limit
  await generateTeam(user.id);

  // only second team should be returned
  const { team: team2 } = await generateTeam(user.id);

  // third team goes first and gonna be skipped due to offset
  await generateTeam(user.id);

  // deleted team should not appear in the query result
  await generateTeam(user.id, { deletedAt: new Date() });

  const [response, body] = await post("/v2", {
    body: buildRequest(user.id, 1, 1),
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(body, {
    data: {
      FindTeams: {
        list: [{ id: team2.id }],
        meta: {
          total: 3,
        },
      },
    },
  });
});
