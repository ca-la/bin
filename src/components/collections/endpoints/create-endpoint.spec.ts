import uuid from "node-uuid";
import { test, sandbox, Test } from "../../../test-helpers/fresh";
import createUser from "../../../test-helpers/create-user";
import { authHeader, post } from "../../../test-helpers/http";
import { generateTeam } from "../../../test-helpers/factories/team";
import { generateTeamUser } from "../../../test-helpers/factories/team-user";
import { TeamUserRole } from "../../team-users";
import * as TeamsService from "../../teams/service";

function buildRequest(teamId: string) {
  return {
    query: `mutation ($collection: CollectionInput!) {
      createCollection(collection: $collection) {
        id
        title
        teamId
      }
    }`,
    variables: {
      collection: {
        id: uuid.v4(),
        teamId,
        title: "Col1",
      },
    },
  };
}

test("createCollection needs authentication", async (t: Test) => {
  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest("t1"),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(forbiddenBody.errors[0].message, "Unauthorized");
});

test("createCollection is forbidden for not a team member", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { session } = await createUser();
  const { team } = await generateTeam(user.id);

  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest(team.id),
    headers: authHeader(session.id),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(
    forbiddenBody.errors[0].message,
    "You are not allowed to create collections for this team"
  );
});

test("createCollection is forbidden for a viewer", async (t: Test) => {
  const { user: owner } = await createUser({ withSession: false });
  const { session, user } = await createUser();
  const { team } = await generateTeam(owner.id);
  await generateTeamUser({
    userId: user.id,
    teamId: team.id,
    role: TeamUserRole.VIEWER,
  });

  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest(team.id),
    headers: authHeader(session.id),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(
    forbiddenBody.errors[0].message,
    "You are not allowed to create collections for this team"
  );
});

test("createCollection is allowed for CALA admin, owner, admin and editor", async (t: Test) => {
  const { session: calaAdminSession } = await createUser({ role: "ADMIN" });
  const { session: ownerSession, user: owner } = await createUser();
  const { session: editorSession, user: editor } = await createUser();
  const { session: adminSession, user: admin } = await createUser();
  const { team } = await generateTeam(owner.id);
  await generateTeamUser({
    userId: editor.id,
    teamId: team.id,
    role: TeamUserRole.EDITOR,
  });
  await generateTeamUser({
    userId: admin.id,
    teamId: team.id,
    role: TeamUserRole.ADMIN,
  });

  const [, ownerBody] = await post("/v2", {
    body: buildRequest(team.id),
    headers: authHeader(ownerSession.id),
  });
  t.equal(ownerBody.data.createCollection.title, "Col1");

  const [, editorBody] = await post("/v2", {
    body: buildRequest(team.id),
    headers: authHeader(editorSession.id),
  });
  t.equal(editorBody.data.createCollection.title, "Col1");

  const [, adminBody] = await post("/v2", {
    body: buildRequest(team.id),
    headers: authHeader(adminSession.id),
  });
  t.equal(adminBody.data.createCollection.title, "Col1");

  const [, calaAdminBody] = await post("/v2", {
    body: buildRequest(team.id),
    headers: authHeader(calaAdminSession.id),
  });
  t.equal(calaAdminBody.data.createCollection.title, "Col1");
});

test("createCollection returns UpgradeTeamError if the limit is reached", async (t: Test) => {
  const { session, user } = await createUser();
  const { team } = await generateTeam(user.id);

  sandbox().stub(TeamsService, "checkCollectionsLimit").resolves({
    isReached: true,
    limit: 3,
  });

  const [, body] = await post("/v2", {
    body: buildRequest(team.id),
    headers: authHeader(session.id),
  });

  t.equal(body.errors[0].message, "Upgrade team");
});
