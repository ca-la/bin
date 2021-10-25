import { test, Test } from "../../../test-helpers/fresh";
import createUser from "../../../test-helpers/create-user";
import { authHeader, post } from "../../../test-helpers/http";
import { generateTeam } from "../../../test-helpers/factories/team";
import { Role as TeamUserRole } from "../../team-users/types";

function buildRequest(teamId: string) {
  return {
    query: `query ($teamId: String!) {
      TeamAndEnvironment(teamId: $teamId) {
        teamId
        team {
          teamUserId
          role
        }
      }
    }`,
    variables: {
      teamId,
    },
  };
}

test("TeamAndEnvironment needs authentication", async (t: Test) => {
  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest("t1"),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(forbiddenBody.errors[0].message, "Unauthorized");
});

test("TeamAndEnvironment is forbidden for arbitrary user", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { session } = await createUser();
  const { team } = await generateTeam(user.id);

  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest(team.id),
    headers: authHeader(session.id),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(forbiddenBody.errors[0].message, "Not authorized to view this team");
});

test("TeamAndEnvironment returns teamId for team members", async (t: Test) => {
  const { user, session } = await createUser();
  const { team, teamUser } = await generateTeam(user.id);

  const [response, body] = await post("/v2", {
    body: buildRequest(team.id),
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(body, {
    data: {
      TeamAndEnvironment: {
        teamId: team.id,
        team: {
          teamUserId: teamUser.id,
          role: teamUser.role,
        },
      },
    },
  });
});

test("TeamAndEnvironment returns teamId === null for CALA admins", async (t: Test) => {
  const { user } = await createUser();
  const { session } = await createUser({ role: "ADMIN" });
  const { team } = await generateTeam(user.id);

  const [response, body] = await post("/v2", {
    body: buildRequest(team.id),
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(body, {
    data: {
      TeamAndEnvironment: {
        teamId: team.id,
        team: {
          teamUserId: null,
          role: TeamUserRole.ADMIN,
        },
      },
    },
  });
});
