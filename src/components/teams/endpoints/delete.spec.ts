import { sandbox, test, Test } from "../../../test-helpers/fresh";
import createUser from "../../../test-helpers/create-user";
import { authHeader, post } from "../../../test-helpers/http";
import { generateTeam } from "../../../test-helpers/factories/team";
import { generateTeamUser } from "../../../test-helpers/factories/team-user";
import { Role as TeamUserRole } from "../../team-users/types";
import TeamsDAO from "../dao";

function buildRequest(teamId: string) {
  return {
    query: `mutation ($teamId: String!) {
      deleteTeam(teamId: $teamId) {
        id
      }
    }`,
    variables: {
      teamId,
    },
  };
}

test("deleteTeam requires authentication", async (t: Test) => {
  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest("id"),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(forbiddenBody.errors[0].message, "Unauthorized");
});

test("deleteTeam isn't allowed for arbitrary users", async (t: Test) => {
  const { user } = await createUser();
  const { session } = await createUser();
  const { team } = await generateTeam(user.id);

  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest(team.id),
    headers: authHeader(session.id),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(forbiddenBody.errors[0].message, "Not authorized to view this team");
});

test("deleteTeam isn't allowed for team users < ADMIN", async (t: Test) => {
  const { user: owner } = await createUser();
  const { team } = await generateTeam(owner.id);

  const { user: viewer, session: viewerSession } = await createUser();
  await generateTeamUser({
    teamId: team.id,
    userId: viewer.id,
    role: TeamUserRole.VIEWER,
  });

  const { user: partner, session: partnerSession } = await createUser();
  await generateTeamUser({
    teamId: team.id,
    userId: partner.id,
    role: TeamUserRole.TEAM_PARTNER,
  });

  const { user: editor, session: editorSession } = await createUser();
  await generateTeamUser({
    teamId: team.id,
    userId: editor.id,
    role: TeamUserRole.EDITOR,
  });

  const [, viewerBody] = await post("/v2", {
    body: buildRequest(team.id),
    headers: authHeader(viewerSession.id),
  });
  t.equal(
    viewerBody.errors[0].message,
    "Not authorized to perform this action on the team"
  );

  const [, editorBody] = await post("/v2", {
    body: buildRequest(team.id),
    headers: authHeader(editorSession.id),
  });
  t.equal(
    editorBody.errors[0].message,
    "Not authorized to perform this action on the team"
  );

  const [, partnerBody] = await post("/v2", {
    body: buildRequest(team.id),
    headers: authHeader(partnerSession.id),
  });
  t.equal(
    partnerBody.errors[0].message,
    "Not authorized to perform this action on the team"
  );
});

test("deleteTeam is allowed for owner, team admins, and CALA admins", async (t: Test) => {
  const { session: calaAdminSession } = await createUser({ role: "ADMIN" });
  const { user: owner, session: ownerSession } = await createUser();
  const { team } = await generateTeam(owner.id);
  sandbox().stub(TeamsDAO, "deleteById").resolves(team);

  const { user: admin, session: adminSession } = await createUser();
  await generateTeamUser({
    teamId: team.id,
    userId: admin.id,
    role: TeamUserRole.ADMIN,
  });

  const [, calaAdminBody] = await post("/v2", {
    body: buildRequest(team.id),
    headers: authHeader(calaAdminSession.id),
  });
  t.deepEqual(calaAdminBody.data.deleteTeam, { id: team.id });

  const [, ownerBody] = await post("/v2", {
    body: buildRequest(team.id),
    headers: authHeader(ownerSession.id),
  });
  t.deepEqual(ownerBody.data.deleteTeam, { id: team.id });

  const [, adminBody] = await post("/v2", {
    body: buildRequest(team.id),
    headers: authHeader(adminSession.id),
  });
  t.deepEqual(adminBody.data.deleteTeam, { id: team.id });
});
