import uuid from "node-uuid";
import Knex from "knex";

import db from "../../../services/db";
import * as CollaboratorsDAO from "../../collaborators/dao";
import { CollaboratorRoles } from "../../collaborators/types";
import * as CollectionsDAO from "../dao";
import * as ProductDesignsDAO from "../../product-designs/dao/dao";
import API from "../../../test-helpers/http";
import * as CreateDesignTasksService from "../../../services/create-design-tasks";
import { sandbox, test, Test } from "../../../test-helpers/fresh";
import createUser from "../../../test-helpers/create-user";
import generateCollaborator from "../../../test-helpers/factories/collaborator";
import generateCollection from "../../../test-helpers/factories/collection";
import { generateDesign } from "../../../test-helpers/factories/product-design";
import ProductDesign = require("../../product-designs/domain-objects/product-design");
import { Role as TeamUserRole } from "../../team-users/types";
import { ROLES } from "../../users/types";
import { generateTeam } from "../../../test-helpers/factories/team";
import { generateTeamUser } from "../../../test-helpers/factories/team-user";

test("PUT + DEL /collections/:id/designs supports moving many designs to from/the collection", async (t: Test) => {
  sandbox().stub(CreateDesignTasksService, "createDesignTasks").resolves();
  const { user, session } = await createUser();
  const { team } = await generateTeam(user.id);
  const { collection: c1 } = await generateCollection({
    createdBy: user.id,
    teamId: team.id,
  });
  const d1 = await generateDesign({
    createdAt: new Date("2019-04-20"),
    userId: user.id,
    collectionIds: [c1.id],
  });
  const d2 = await generateDesign({
    createdAt: new Date("2019-04-21"),
    userId: user.id,
    collectionIds: [c1.id],
  });
  const d3 = await generateDesign({
    createdAt: new Date("2019-04-22"),
    userId: user.id,
    collectionIds: [c1.id],
  });

  const [response1, body1] = await API.put(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d2.id, d3.id].join(
      ","
    )}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(response1.status, 200);
  t.deepEqual(
    body1.map((design: ProductDesign) => design.id),
    [d3.id, d2.id, d1.id]
  );

  const [response2, body2] = await API.del(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d3.id].join(",")}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(response2.status, 200);
  t.deepEqual(
    body2.map((design: ProductDesign) => design.id),
    [d2.id]
  );

  t.ok(
    await CollaboratorsDAO.findByDesignAndUser(d1.id, user.id),
    "Creates a collaborator for the actor for first deleted design"
  );

  t.ok(
    await CollaboratorsDAO.findByDesignAndUser(d3.id, user.id),
    "Creates a collaborator for the actor for second deleted design"
  );

  t.notOk(
    await CollaboratorsDAO.findByDesignAndUser(d2.id, user.id),
    "Does not create a collaborator for the actor for the not deleted design"
  );
});

test("PUT + DEL /collections/:id/designs is not allowed without team-level access", async (t: Test) => {
  const { user, session } = await createUser();
  const { user: user2 } = await createUser({ withSession: false });
  const { collection: c1 } = await generateCollection({ createdBy: user2.id });
  const d1 = await generateDesign({
    createdAt: new Date("2019-04-20"),
    userId: user.id,
  });
  const d2 = await generateDesign({
    createdAt: new Date("2019-04-21"),
    userId: user.id,
  });
  const d3 = await generateDesign({
    createdAt: new Date("2019-04-22"),
    userId: user.id,
  });

  const [response1, body1] = await API.put(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d2.id, d3.id].join(
      ","
    )}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(
    response1.status,
    403,
    "not a team member can not put designs to the collection"
  );
  t.equal(body1.message, "You don't have permission to view this collection");

  const [response2, body2] = await API.del(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d3.id].join(",")}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(
    response2.status,
    403,
    "not a team member can not delete designs from the collection"
  );
  t.equal(body2.message, "You don't have permission to view this collection");
});

test("PUT + DEL /collections/:id/designs is not allowed for collection owner without team-level access", async (t: Test) => {
  const { user, session } = await createUser();
  const { collection: c1 } = await generateCollection({ createdBy: user.id });
  const d1 = await generateDesign({
    createdAt: new Date("2019-04-20"),
    userId: user.id,
  });
  const d2 = await generateDesign({
    createdAt: new Date("2019-04-21"),
    userId: user.id,
  });
  const d3 = await generateDesign({
    createdAt: new Date("2019-04-22"),
    userId: user.id,
  });

  const [response1, body1] = await API.put(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d2.id, d3.id].join(
      ","
    )}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(
    response1.status,
    403,
    "collection owner without the team permissions can not put designs into collection"
  );
  t.equal(body1.message, "You don't have permission to delete this collection");

  const [response2, body2] = await API.del(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d3.id].join(",")}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(
    response2.status,
    403,
    "collection owner without the team permissions can not delete own designs form the collection"
  );
  t.equal(body2.message, "You don't have permission to delete this collection");
});

test("PUT + DEL /collections/:id/designs is not allowed for collection PARTNER without team-level access", async (t: Test) => {
  const { user, session } = await createUser({ role: ROLES.PARTNER });
  const { collection: c1 } = await generateCollection({ createdBy: user.id });
  await generateCollaborator({
    collectionId: c1.id,
    userId: user.id,
    role: CollaboratorRoles.PARTNER,
  });
  const d1 = await generateDesign({
    createdAt: new Date("2019-04-20"),
    userId: user.id,
  });
  const d2 = await generateDesign({
    createdAt: new Date("2019-04-21"),
    userId: user.id,
  });
  const d3 = await generateDesign({
    createdAt: new Date("2019-04-22"),
    userId: user.id,
  });

  const [response1, body1] = await API.put(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d2.id, d3.id].join(
      ","
    )}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(
    response1.status,
    403,
    "collection PARTNER without the team permissions can not put designs into collection"
  );
  t.equal(body1.message, "You don't have permission to delete this collection");

  const [response2, body2] = await API.del(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d3.id].join(",")}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(
    response2.status,
    403,
    "collection PARTNER without the team permissions can not delete own designs form the collection"
  );
  t.equal(body2.message, "You don't have permission to delete this collection");
});

test("PUT + DEL /collections/:id/designs is not allowed for collection editor without team-level access", async (t: Test) => {
  const { user } = await createUser();
  const {
    user: editCollaboratorUser,
    session: editCollaboratorSession,
  } = await createUser();
  const { collection: c1 } = await generateCollection({ createdBy: user.id });
  await generateCollaborator({
    collectionId: c1.id,
    userId: editCollaboratorUser.id,
    role: CollaboratorRoles.EDIT,
  });
  const d1 = await generateDesign({
    createdAt: new Date("2019-04-20"),
    userId: user.id,
  });
  const d2 = await generateDesign({
    createdAt: new Date("2019-04-21"),
    userId: user.id,
  });
  const d3 = await generateDesign({
    createdAt: new Date("2019-04-22"),
    userId: user.id,
  });

  const [response1, body1] = await API.put(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d2.id, d3.id].join(
      ","
    )}`,
    {
      headers: API.authHeader(editCollaboratorSession.id),
    }
  );

  t.equal(
    response1.status,
    403,
    "collection collaborator with EDIT role without the team permissions can not put designs into collection"
  );
  t.equal(body1.message, "You don't have permission to delete this collection");

  const [response2, body2] = await API.del(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d3.id].join(",")}`,
    {
      headers: API.authHeader(editCollaboratorSession.id),
    }
  );

  t.equal(
    response2.status,
    403,
    "collection collaborator with EDIT role without the team permissions can not delete own designs form the collection"
  );
  t.equal(body2.message, "You don't have permission to delete this collection");
});

test("PUT + DEL /collections/:id/designs is not allowed for collection editor with VIEWER team-level access", async (t: Test) => {
  const { user } = await createUser();
  const {
    user: editCollaboratorUser,
    session: editCollaboratorSession,
  } = await createUser();

  const { team } = await generateTeam(user.id);
  generateTeamUser({
    userId: editCollaboratorUser.id,
    teamId: team.id,
    role: TeamUserRole.VIEWER,
  });

  const { collection: c1 } = await generateCollection({
    createdBy: user.id,
    teamId: team.id,
  });
  await generateCollaborator({
    collectionId: c1.id,
    userId: editCollaboratorUser.id,
    role: CollaboratorRoles.EDIT,
  });
  const d1 = await generateDesign({
    createdAt: new Date("2019-04-20"),
    userId: user.id,
  });
  const d2 = await generateDesign({
    createdAt: new Date("2019-04-21"),
    userId: user.id,
  });
  const d3 = await generateDesign({
    createdAt: new Date("2019-04-22"),
    userId: user.id,
  });

  const [response1, body1] = await API.put(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d2.id, d3.id].join(
      ","
    )}`,
    {
      headers: API.authHeader(editCollaboratorSession.id),
    }
  );

  t.equal(
    response1.status,
    403,
    "collection collaborator with EDIT role with VIEWER team-level access can not put designs into collection"
  );
  t.equal(body1.message, "You don't have permission to delete this collection");

  const [response2, body2] = await API.del(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d3.id].join(",")}`,
    {
      headers: API.authHeader(editCollaboratorSession.id),
    }
  );

  t.equal(
    response2.status,
    403,
    "collection collaborator with EDIT role with VIEWER team-level access can not delete designs form the collection"
  );
  t.equal(body2.message, "You don't have permission to delete this collection");
});

test("PUT + DEL /collections/:id/designs is not allowed for team user with VIEWER team-level access", async (t: Test) => {
  const { user } = await createUser();
  const {
    user: teamViewerUser,
    session: teamViewerSession,
  } = await createUser();

  const { team } = await generateTeam(user.id);
  generateTeamUser({
    userId: teamViewerUser.id,
    teamId: team.id,
    role: TeamUserRole.VIEWER,
  });

  const { collection: c1 } = await generateCollection({
    createdBy: user.id,
    teamId: team.id,
  });
  const d1 = await generateDesign({
    createdAt: new Date("2019-04-20"),
    userId: user.id,
  });
  const d2 = await generateDesign({
    createdAt: new Date("2019-04-21"),
    userId: user.id,
  });
  const d3 = await generateDesign({
    createdAt: new Date("2019-04-22"),
    userId: user.id,
  });

  const [response1, body1] = await API.put(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d2.id, d3.id].join(
      ","
    )}`,
    {
      headers: API.authHeader(teamViewerSession.id),
    }
  );

  t.equal(
    response1.status,
    403,
    "team user with VIEWER team-level access can not put designs into collection"
  );
  t.equal(body1.message, "You don't have permission to edit this collection");

  const [response2, body2] = await API.del(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d3.id].join(",")}`,
    {
      headers: API.authHeader(teamViewerSession.id),
    }
  );

  t.equal(
    response2.status,
    403,
    "team user with VIEWER team-level access can not delete designs form the collection"
  );
  t.equal(body2.message, "You don't have permission to edit this collection");
});

test("PUT + DEL /collections/:id/designs is allowed for collection viewer collaborator with EDITOR team-level access", async (t: Test) => {
  const { user } = await createUser();
  const {
    user: editCollaboratorUser,
    session: editCollaboratorSession,
  } = await createUser();

  const { team } = await generateTeam(user.id);
  generateTeamUser({
    userId: editCollaboratorUser.id,
    teamId: team.id,
    role: TeamUserRole.EDITOR,
  });

  const { collection: c1 } = await generateCollection({
    createdBy: user.id,
    teamId: team.id,
  });
  await generateCollaborator({
    collectionId: c1.id,
    userId: editCollaboratorUser.id,
    role: CollaboratorRoles.VIEW,
  });
  const d1 = await generateDesign({
    createdAt: new Date("2019-04-20"),
    userId: user.id,
  });
  const d2 = await generateDesign({
    createdAt: new Date("2019-04-21"),
    userId: user.id,
  });
  const d3 = await generateDesign({
    createdAt: new Date("2019-04-22"),
    userId: user.id,
  });

  const [response1] = await API.put(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d2.id, d3.id].join(
      ","
    )}`,
    {
      headers: API.authHeader(editCollaboratorSession.id),
    }
  );

  t.equal(
    response1.status,
    200,
    "collection collaborator with VIEW role and EDITOR team-level access can put designs into collection"
  );

  const [response2] = await API.del(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d3.id].join(",")}`,
    {
      headers: API.authHeader(editCollaboratorSession.id),
    }
  );

  t.equal(
    response2.status,
    200,
    "collection collaborator with VIEW role and EDITOR team-level access can delete designs form the collection"
  );
});

test("PUT + DEL /collections/:id/designs is allowed for collection editor with EDITOR team-level access", async (t: Test) => {
  const { user } = await createUser();
  const {
    user: editCollaboratorUser,
    session: editCollaboratorSession,
  } = await createUser();

  const { team } = await generateTeam(user.id);
  generateTeamUser({
    userId: editCollaboratorUser.id,
    teamId: team.id,
    role: TeamUserRole.EDITOR,
  });

  const { collection: c1 } = await generateCollection({
    createdBy: user.id,
    teamId: team.id,
  });
  await generateCollaborator({
    collectionId: c1.id,
    userId: editCollaboratorUser.id,
    role: CollaboratorRoles.EDIT,
  });
  const d1 = await generateDesign({
    createdAt: new Date("2019-04-20"),
    userId: user.id,
  });
  const d2 = await generateDesign({
    createdAt: new Date("2019-04-21"),
    userId: user.id,
  });
  const d3 = await generateDesign({
    createdAt: new Date("2019-04-22"),
    userId: user.id,
  });

  const [response1] = await API.put(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d2.id, d3.id].join(
      ","
    )}`,
    {
      headers: API.authHeader(editCollaboratorSession.id),
    }
  );

  t.equal(
    response1.status,
    200,
    "collection collaborator with EDIT role and EDITOR team-level access can put designs into collection"
  );

  const [response2] = await API.del(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d3.id].join(",")}`,
    {
      headers: API.authHeader(editCollaboratorSession.id),
    }
  );

  t.equal(
    response2.status,
    200,
    "collection collaborator with EDIT role and EDITOR team-level access can delete designs form the collection"
  );
});

test("PUT + DEL /collections/:id/designs is allowed for team user with EDITOR team-level access", async (t: Test) => {
  const { user } = await createUser();
  const {
    user: teamEditorUser,
    session: teamEditorSession,
  } = await createUser();

  const { team } = await generateTeam(user.id);
  generateTeamUser({
    userId: teamEditorUser.id,
    teamId: team.id,
    role: TeamUserRole.EDITOR,
  });

  const { collection: c1 } = await generateCollection({
    createdBy: user.id,
    teamId: team.id,
  });
  const d1 = await generateDesign({
    createdAt: new Date("2019-04-20"),
    userId: user.id,
  });
  const d2 = await generateDesign({
    createdAt: new Date("2019-04-21"),
    userId: user.id,
  });
  const d3 = await generateDesign({
    createdAt: new Date("2019-04-22"),
    userId: user.id,
  });

  const [response1] = await API.put(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d2.id, d3.id].join(
      ","
    )}`,
    {
      headers: API.authHeader(teamEditorSession.id),
    }
  );

  t.equal(
    response1.status,
    200,
    "team user with EDITOR team-level access can put designs into collection"
  );

  const [response2] = await API.del(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d3.id].join(",")}`,
    {
      headers: API.authHeader(teamEditorSession.id),
    }
  );

  t.equal(
    response2.status,
    200,
    "team user with EDITOR team-level access can put designs into collection"
  );
});

test("PUT + DEL /collections/:id/designs without designs", async (t: Test) => {
  const { user, session } = await createUser();
  const { team } = await generateTeam(user.id);
  generateTeamUser({
    userId: user.id,
    teamId: team.id,
    role: TeamUserRole.EDITOR,
  });
  const { collection: c1 } = await generateCollection({
    createdBy: user.id,
    teamId: team.id,
  });

  const [response1, body1] = await API.put(
    `/collections/${c1.id}/designs?designIds=`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(response1.status, 400);
  t.equal(body1.message, "designIds is a required query parameter.");

  const [response2, body2] = await API.del(
    `/collections/${c1.id}/designs?designIds=`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(response2.status, 400);
  t.equal(body2.message, "designIds is a required query parameter.");
});

test("PUT + DEL /collections/:id/designs is allowed for the CALA Admin", async (t: Test) => {
  const { session: adminSession } = await createUser({ role: ROLES.ADMIN });
  const { user } = await createUser();
  const { user: editCollaboratorUser } = await createUser();

  const { team } = await generateTeam(user.id);
  const { collection: c1 } = await generateCollection({
    createdBy: user.id,
    teamId: team.id,
  });
  await generateCollaborator({
    collectionId: c1.id,
    userId: editCollaboratorUser.id,
    role: CollaboratorRoles.VIEW,
  });
  const d1 = await generateDesign({
    createdAt: new Date("2019-04-20"),
    userId: user.id,
  });
  const d2 = await generateDesign({
    createdAt: new Date("2019-04-21"),
    userId: user.id,
  });
  const d3 = await generateDesign({
    createdAt: new Date("2019-04-22"),
    userId: user.id,
  });

  const [response1] = await API.put(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d2.id, d3.id].join(
      ","
    )}`,
    {
      headers: API.authHeader(adminSession.id),
    }
  );

  t.equal(response1.status, 200, "CALA admin can put designs into collection");

  const [response2] = await API.del(
    `/collections/${c1.id}/designs?designIds=${[d1.id, d3.id].join(",")}`,
    {
      headers: API.authHeader(adminSession.id),
    }
  );

  t.equal(
    response2.status,
    200,
    "CALA admin can delete designs form the collection"
  );
});

test("PUT + DEL /collections/:id/designs/:id is not allowed without team-level access", async (t: Test) => {
  const { user, session } = await createUser();
  const { user: user2 } = await createUser({ withSession: false });
  const { collection: c1 } = await generateCollection({ createdBy: user2.id });
  const d1 = await generateDesign({
    createdAt: new Date("2019-04-20"),
    userId: user.id,
  });

  const [response1, body1] = await API.put(
    `/collections/${c1.id}/designs/${d1.id}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(
    response1.status,
    403,
    "not a team member can not put design to the collection"
  );
  t.equal(body1.message, "You don't have permission to view this collection");

  const [response2, body2] = await API.del(
    `/collections/${c1.id}/designs/${d1.id}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(
    response2.status,
    403,
    "not a team member can not delete design from the collection"
  );
  t.equal(body2.message, "You don't have permission to view this collection");
});

test("PUT + DEL /collections/:id/designs/:id is not allowed for collection owner without team-level access", async (t: Test) => {
  const { user, session } = await createUser();
  const { collection: c1 } = await generateCollection({ createdBy: user.id });
  const d1 = await generateDesign({
    createdAt: new Date("2019-04-20"),
    userId: user.id,
  });

  const [response1, body1] = await API.put(
    `/collections/${c1.id}/designs/${d1.id}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(
    response1.status,
    403,
    "even collection owner who is not a team member can not put design to the collection"
  );
  t.equal(body1.message, "You don't have permission to delete this collection");

  const [response2, body2] = await API.del(
    `/collections/${c1.id}/designs/${d1.id}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(
    response2.status,
    403,
    "even collection owner who is not a team member can not delete design from the collection"
  );
  t.equal(body2.message, "You don't have permission to delete this collection");
});

test("PUT + DEL /collections/:id/designs/:id is not allowed for collection viewer without team-level access", async (t: Test) => {
  const { user, session } = await createUser();
  const { user: collectionOwner } = await createUser();
  const { collection: c1 } = await generateCollection({
    createdBy: collectionOwner.id,
  });
  await generateCollaborator({
    collectionId: c1.id,
    userId: user.id,
    role: CollaboratorRoles.VIEW,
  });
  const d1 = await generateDesign({
    createdAt: new Date("2019-04-20"),
    userId: user.id,
  });

  const [response1, body1] = await API.put(
    `/collections/${c1.id}/designs/${d1.id}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(
    response1.status,
    403,
    "collection collaborator with VIEW role  who is not a team member can not put design to the collection"
  );
  t.equal(body1.message, "You don't have permission to edit this collection");

  const [response2, body2] = await API.del(
    `/collections/${c1.id}/designs/${d1.id}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(
    response2.status,
    403,
    "collection collaborator with VIEW role who is not a team member can not delete design from the collection"
  );
  t.equal(body2.message, "You don't have permission to edit this collection");
});

test("PUT + DEL /collections/:id/designs/:id is not allowed for collection PARTNER without team-level access", async (t: Test) => {
  const { user, session } = await createUser({ role: ROLES.PARTNER });
  const { user: collectionOwner } = await createUser();
  const { collection: c1 } = await generateCollection({
    createdBy: collectionOwner.id,
  });
  await generateCollaborator({
    collectionId: c1.id,
    userId: user.id,
    role: CollaboratorRoles.PARTNER,
  });
  const d1 = await generateDesign({
    createdAt: new Date("2019-04-20"),
    userId: user.id,
  });

  const [response1, body1] = await API.put(
    `/collections/${c1.id}/designs/${d1.id}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(
    response1.status,
    403,
    "collection collaborator with PARTNER role who is not a team member can not put design to the collection"
  );
  t.equal(body1.message, "You don't have permission to delete this collection");

  const [response2, body2] = await API.del(
    `/collections/${c1.id}/designs/${d1.id}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(
    response2.status,
    403,
    "collection collaborator with PARTNER role who is not a team member can not delete design from the collection"
  );
  t.equal(body2.message, "You don't have permission to delete this collection");
});

test("PUT + DEL /collections/:id/designs/:id is not allowed for collection EDITOR without team-level access", async (t: Test) => {
  const { user, session } = await createUser();
  const { user: collectionOwner } = await createUser();
  const { collection: c1 } = await generateCollection({
    createdBy: collectionOwner.id,
  });
  await generateCollaborator({
    collectionId: c1.id,
    userId: user.id,
    role: CollaboratorRoles.EDIT,
  });
  const d1 = await generateDesign({
    createdAt: new Date("2019-04-20"),
    userId: user.id,
  });

  const [response1, body1] = await API.put(
    `/collections/${c1.id}/designs/${d1.id}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(
    response1.status,
    403,
    "collection collaborator with EDIT role  who is not a team member can not put design to the collection"
  );
  t.equal(body1.message, "You don't have permission to delete this collection");

  const [response2, body2] = await API.del(
    `/collections/${c1.id}/designs/${d1.id}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(
    response2.status,
    403,
    "collection collaborator with EDIT role who is not a team member can not delete design from the collection"
  );
  t.equal(body2.message, "You don't have permission to delete this collection");
});

test("PUT + DEL /collections/:id/designs/:id is not allowed for team user with VIEWER team-level access", async (t: Test) => {
  const { user, session } = await createUser();
  const { user: collectionAndTeamOwner } = await createUser();
  const { team } = await generateTeam(collectionAndTeamOwner.id);
  generateTeamUser({
    userId: user.id,
    teamId: team.id,
    role: TeamUserRole.VIEWER,
  });
  const { collection: c1 } = await generateCollection({
    createdBy: collectionAndTeamOwner.id,
    teamId: team.id,
  });
  const d1 = await generateDesign({
    createdAt: new Date("2019-04-20"),
    userId: user.id,
  });

  const [response1, body1] = await API.put(
    `/collections/${c1.id}/designs/${d1.id}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(
    response1.status,
    403,
    "team user with VIEWER role can not put design to the collection"
  );
  t.equal(body1.message, "You don't have permission to edit this collection");

  const [response2, body2] = await API.del(
    `/collections/${c1.id}/designs/${d1.id}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(
    response2.status,
    403,
    "team user with VIEWER role can not delete design from the collection"
  );
  t.equal(body2.message, "You don't have permission to edit this collection");
});

test("PUT + DEL /collections/:id/designs/:id is not allowed for collection editor with VIEWER team-level access", async (t: Test) => {
  const { user, session } = await createUser();
  const { user: collectionAndTeamOwner } = await createUser();
  const { team } = await generateTeam(collectionAndTeamOwner.id);
  generateTeamUser({
    userId: user.id,
    teamId: team.id,
    role: TeamUserRole.VIEWER,
  });
  const { collection: c1 } = await generateCollection({
    createdBy: collectionAndTeamOwner.id,
    teamId: team.id,
  });
  await generateCollaborator({
    collectionId: c1.id,
    userId: user.id,
    role: CollaboratorRoles.EDIT,
  });
  const d1 = await generateDesign({
    createdAt: new Date("2019-04-20"),
    userId: user.id,
  });

  const [response1, body1] = await API.put(
    `/collections/${c1.id}/designs/${d1.id}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(
    response1.status,
    403,
    "collection collaborator with EDIT role who is a team user with VIEWER role can not put design to the collection"
  );
  t.equal(body1.message, "You don't have permission to delete this collection");

  const [response2, body2] = await API.del(
    `/collections/${c1.id}/designs/${d1.id}`,
    {
      headers: API.authHeader(session.id),
    }
  );

  t.equal(
    response2.status,
    403,
    "collection collaborator with EDIT role who is a team user with VIEWER role can not delete design from the collection"
  );
  t.equal(body2.message, "You don't have permission to delete this collection");
});

test("PUT + DEL /collections/:id/designs/:id is allowed for team user with EDITOR team-level access", async (t: Test) => {
  const { user, session } = await createUser();
  const { user: collectionAndTeamOwner } = await createUser();
  const { team } = await generateTeam(collectionAndTeamOwner.id);
  generateTeamUser({
    userId: user.id,
    teamId: team.id,
    role: TeamUserRole.EDITOR,
  });
  const { collection: c1 } = await generateCollection({
    createdBy: collectionAndTeamOwner.id,
    teamId: team.id,
  });
  const d1 = await generateDesign({
    createdAt: new Date("2019-04-20"),
    userId: user.id,
  });

  const [response1] = await API.put(`/collections/${c1.id}/designs/${d1.id}`, {
    headers: API.authHeader(session.id),
  });

  t.equal(
    response1.status,
    200,
    "team user with EDITOR role can put design to the collection"
  );

  const [response2] = await API.del(`/collections/${c1.id}/designs/${d1.id}`, {
    headers: API.authHeader(session.id),
  });

  t.equal(
    response2.status,
    200,
    "team user with EDITOR role can delete design from the collection"
  );
});

test("PUT + DEL /collections/:id/designs/:id is allowed for collection editor with EDITOR team-level access", async (t: Test) => {
  const { user, session } = await createUser();
  const { user: collectionAndTeamOwner } = await createUser();
  const { team } = await generateTeam(collectionAndTeamOwner.id);
  generateTeamUser({
    userId: user.id,
    teamId: team.id,
    role: TeamUserRole.EDITOR,
  });
  const { collection: c1 } = await generateCollection({
    createdBy: collectionAndTeamOwner.id,
    teamId: team.id,
  });
  await generateCollaborator({
    collectionId: c1.id,
    userId: user.id,
    role: CollaboratorRoles.EDIT,
  });
  const d1 = await generateDesign({
    createdAt: new Date("2019-04-20"),
    userId: user.id,
  });

  const [response1] = await API.put(`/collections/${c1.id}/designs/${d1.id}`, {
    headers: API.authHeader(session.id),
  });

  t.equal(
    response1.status,
    200,
    "team user with EDITOR role can put design to the collection"
  );

  const [response2] = await API.del(`/collections/${c1.id}/designs/${d1.id}`, {
    headers: API.authHeader(session.id),
  });

  t.equal(
    response2.status,
    200,
    "team user with EDITOR role can delete design from the collection"
  );
});

test("PUT + DEL /collections/:id/designs/:id is allowed for CALA Admin", async (t: Test) => {
  const { session: adminSession } = await createUser({ role: ROLES.ADMIN });
  const { user } = await createUser();

  const { team } = await generateTeam(user.id);
  const { collection: c1 } = await generateCollection({
    createdBy: user.id,
    teamId: team.id,
  });
  const d1 = await generateDesign({
    createdAt: new Date("2019-04-20"),
    userId: user.id,
  });

  const [response1] = await API.put(`/collections/${c1.id}/designs/${d1.id}`, {
    headers: API.authHeader(adminSession.id),
  });

  t.equal(response1.status, 200, "CALA admin can put design into collection");

  const [response2] = await API.del(`/collections/${c1.id}/designs/${d1.id}`, {
    headers: API.authHeader(adminSession.id),
  });

  t.equal(
    response2.status,
    200,
    "CALA admin can delete design form the collection"
  );
});

test("GET /collections/:id/designs", async (t: Test) => {
  const { user, session } = await createUser();

  const { team } = await generateTeam(user.id);
  const createdAt = new Date();
  const c1 = await CollectionsDAO.create({
    createdAt,
    createdBy: user.id,
    deletedAt: null,
    description: "Initial commit",
    id: uuid.v4(),
    teamId: team.id,
    title: "Drop 001/The Early Years",
  });
  const design = await db.transaction((trx: Knex.Transaction) =>
    ProductDesignsDAO.create(trx, "Vader Mask", user.id)
  );
  await generateCollaborator({
    collectionId: null,
    designId: design.id,
    invitationMessage: null,
    role: "EDIT",
    userEmail: null,
    userId: user.id,
  });

  await API.put(`/collections/${c1.id}/designs/${design.id}`, {
    headers: API.authHeader(session.id),
  });

  const [, designs] = await API.get(`/collections/${c1.id}/designs`, {
    headers: API.authHeader(session.id),
  });

  t.equal(designs.length, 1);
  t.deepEqual(
    designs[0],
    {
      ...design,
      collectionIds: [c1.id],
      collections: [{ id: c1.id, title: c1.title }],
      createdAt: design.createdAt.toISOString(),
      permissions: {
        canComment: true,
        canDelete: true,
        canEdit: true,
        canEditTitle: true,
        canEditVariants: true,
        canSubmit: true,
        canView: true,
      },
      role: "OWNER",
    },
    "returns a list of contained designs"
  );
});
