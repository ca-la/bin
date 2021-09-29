import { test, Test } from "../../../test-helpers/fresh";
import createUser from "../../../test-helpers/create-user";
import { authHeader, post } from "../../../test-helpers/http";
import { generateTeam } from "../../../test-helpers/factories/team";
import generateCollection from "../../../test-helpers/factories/collection";

function buildRequest(
  teamId: string,
  limit: number | null,
  offset: number | null
) {
  return {
    query: `query ($teamId: String!, $limit: Int, $offset: Int) {
      TeamAndEnvironment(teamId: $teamId) {
        teamId
        collections(limit: $limit, offset: $offset) {
          title
        }
      }
    }`,
    variables: {
      teamId,
      limit,
      offset,
    },
  };
}

test("TeamAndEnvironment.collections returns collections and respects limit/offset", async (t: Test) => {
  const { user, session } = await createUser();
  const { team } = await generateTeam(user.id);

  await generateCollection({ teamId: team.id, title: "col1" });
  await generateCollection({ teamId: team.id, title: "col2" });
  await generateCollection({ teamId: team.id, title: "col3" });
  await generateCollection({ teamId: team.id, title: "col4" });

  const [response, body] = await post("/v2", {
    body: buildRequest(team.id, 2, 1),
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(body, {
    data: {
      TeamAndEnvironment: {
        teamId: team.id,
        collections: [
          // collections are returned in reverse order
          { title: "col3" },
          { title: "col2" },
        ],
      },
    },
  });
});
