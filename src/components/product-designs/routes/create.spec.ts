import SessionsDAO from "../../../dao/sessions";
import { authHeader, post } from "../../../test-helpers/http";
import { sandbox, test, Test } from "../../../test-helpers/fresh";
import * as CreateDesignService from "../../../services/create-design";
import * as GetPermissionsService from "../../../services/get-permissions";
import * as CreateFromTemplateService from "../../templates/services/create-from-design-template";
import * as UsersDAO from "../../users/dao";
import * as CollectionsDAO from "../../collections/dao";
import TeamUsersDAO from "../../team-users/dao";
import * as CollaboratorsDAO from "../../collaborators/dao";
import { Role as TeamUserRole } from "../../team-users/types";
import { staticProductDesign } from "../../../test-helpers/factories/product-design";

function setup() {
  const design = staticProductDesign({
    title: "A design",
    userId: "a-user-id",
    id: "a-design-id",
  });
  const permissions = {
    canComment: true,
    canDelete: true,
    canEditVariants: false,
    canSubmit: true,
    canView: true,
  };
  const owner = {
    id: "a-user-id",
  };
  const sessionStub = sandbox().stub(SessionsDAO, "findById").resolves({
    id: "a-session-id",
    role: "USER",
    userId: "a-user-id",
  });
  const createFromTemplateStub = sandbox()
    .stub(CreateFromTemplateService, "default")
    .resolves(design);
  const createDesignStub = sandbox()
    .stub(CreateDesignService, "default")
    .resolves(design);
  const getPermissionsStub = sandbox()
    .stub(GetPermissionsService, "getDesignPermissions")
    .resolves(permissions);
  const findUserStub = sandbox().stub(UsersDAO, "findById").resolves(owner);
  const findCollectionStub = sandbox()
    .stub(CollectionsDAO, "findById")
    .resolves({
      id: "a-collection-id",
      teamId: "a-team-id",
    });
  const findCollectionCollaboratorStub = sandbox()
    .stub(CollaboratorsDAO, "findByCollectionAndUser")
    .resolves([
      {
        role: "EDIT",
      },
    ]);
  const findTeamUserStub = sandbox().stub(TeamUsersDAO, "findOne").resolves({
    id: "a-team-user-id",
    role: TeamUserRole.ADMIN,
    user: "a-user-id",
  });

  return {
    design,
    permissions,
    owner,
    sessionStub,
    createDesignStub,
    createFromTemplateStub,
    getPermissionsStub,
    findUserStub,
    findCollectionStub,
    findCollectionCollaboratorStub,
    findTeamUserStub,
  };
}

test("POST /product-designs: team collection", async (t: Test) => {
  const {
    design,
    owner,
    permissions,
    sessionStub,
    createDesignStub,
    findCollectionCollaboratorStub,
    findTeamUserStub,
  } = setup();
  const [response, body] = await post(`/product-designs`, {
    headers: authHeader("a-session-id"),
    body: {
      title: "A design",
      collectionIds: ["a-collection-id"],
    },
  });

  t.equal(response.status, 201, "Returns a created status");
  t.deepEqual(
    body,
    JSON.parse(
      JSON.stringify({
        ...design,
        owner,
        permissions,
      })
    ),
    "returns design with owner and permissions attached"
  );

  t.deepEqual(
    createDesignStub.args[0][0],
    {
      title: "A design",
      collectionIds: ["a-collection-id"],
      userId: "a-user-id",
    },
    "calls create design with the body data"
  );

  t.ok(
    createDesignStub.args[0][1],
    "calls create design with a truthy value (transaction)"
  );

  createDesignStub.resetHistory();
  findTeamUserStub.resolves(null);

  const [collectionCollaborator] = await post(`/product-designs`, {
    headers: authHeader("a-session-id"),
    body: {
      title: "A design",
      collectionIds: ["a-collection-id"],
    },
  });
  t.equal(collectionCollaborator.status, 201, "Returns a created status");
  t.deepEqual(
    createDesignStub.args[0][0],
    {
      title: "A design",
      collectionIds: ["a-collection-id"],
      userId: "a-user-id",
    },
    "calls create design with the body data"
  );

  createDesignStub.resetHistory();
  findTeamUserStub.resolves(null);
  findCollectionCollaboratorStub.resolves([]);
  const [noAccess] = await post(`/product-designs`, {
    headers: authHeader("a-session-id"),
    body: {
      title: "A design",
      collectionIds: ["a-collection-id"],
    },
  });

  t.equal(
    noAccess.status,
    403,
    "Must be a collaborator or team member to create in collection"
  );

  t.false(createDesignStub.called, "Does not call create design stub");

  createDesignStub.resetHistory();
  findTeamUserStub.resolves({
    id: "a-team-user-id",
    role: TeamUserRole.VIEWER,
    user: "a-user-id",
  });
  const [teamViewer] = await post(`/product-designs`, {
    headers: authHeader("a-session-id"),
    body: {
      title: "A design",
      collectionIds: ["a-collection-id"],
    },
  });

  t.equal(teamViewer.status, 403, "Team viewers cannot create team designs");

  t.false(createDesignStub.called, "Does not call create design stub");

  createDesignStub.resetHistory();
  findTeamUserStub.resolves(null);
  findCollectionCollaboratorStub.resolves([]);
  sessionStub.resolves({
    id: "a-session-id",
    role: "ADMIN",
    userId: "an-admin-user-id",
  });

  const [admin] = await post(`/product-designs`, {
    headers: authHeader("a-session-id"),
    body: {
      title: "A design",
      collectionIds: ["a-collection-id"],
    },
  });
  t.equal(admin.status, 201, "Returns a created status");
  t.deepEqual(
    createDesignStub.args[0][0],
    {
      title: "A design",
      collectionIds: ["a-collection-id"],
      userId: "an-admin-user-id",
    },
    "calls create design with the body data"
  );
});

test("POST /product-designs: draft", async (t: Test) => {
  const { design, permissions, owner, createDesignStub } = setup();

  const [response, body] = await post(`/product-designs`, {
    headers: authHeader("a-session-id"),
    body: {
      title: "A design",
    },
  });

  t.equal(response.status, 201, "Returns a created status");
  t.deepEqual(
    body,
    JSON.parse(
      JSON.stringify({
        ...design,
        owner,
        permissions,
      })
    ),
    "returns design with owner and permissions attached"
  );

  t.deepEqual(
    createDesignStub.args[0][0],
    {
      title: "A design",
      userId: "a-user-id",
    },
    "calls create design with the body data"
  );

  t.ok(
    createDesignStub.args[0][1],
    "calls create design with a truthy value (transaction)"
  );
});

test("POST /product-designs/templates/:templateId?collectionId", async (t: Test) => {
  const {
    design,
    owner,
    permissions,
    createFromTemplateStub,
    findTeamUserStub,
    findCollectionCollaboratorStub,
    sessionStub,
  } = setup();

  const [response, body] = await post(
    `/product-designs/templates/a-template-id?collectionId=a-collection-id`,
    {
      headers: authHeader("a-session-id"),
    }
  );

  t.equal(response.status, 201, "Returns a created status");
  t.deepEqual(
    body,
    JSON.parse(
      JSON.stringify({
        ...design,
        owner,
        permissions,
      })
    ),
    "returns design with owner and permissions attached"
  );
  t.deepEqual(
    createFromTemplateStub.args[0][1],
    {
      isPhidias: false,
      newCreatorId: "a-user-id",
      templateDesignId: "a-template-id",
      collectionId: "a-collection-id",
    },
    "calls create design from template with correct values"
  );

  createFromTemplateStub.resetHistory();
  findTeamUserStub.resolves(null);

  const [collectionCollaborator] = await post(
    `/product-designs/templates/a-template-id?collectionId=a-collection-id`,
    {
      headers: authHeader("a-session-id"),
    }
  );

  t.equal(collectionCollaborator.status, 201, "Returns a created status");
  t.deepEqual(
    createFromTemplateStub.args[0][1],
    {
      isPhidias: false,
      newCreatorId: "a-user-id",
      templateDesignId: "a-template-id",
      collectionId: "a-collection-id",
    },
    "calls create design from template with correct values"
  );

  createFromTemplateStub.resetHistory();
  findCollectionCollaboratorStub.resolves([]);

  const [noAccess] = await post(
    `/product-designs/templates/a-template-id?collectionId=a-collection-id`,
    {
      headers: authHeader("a-session-id"),
    }
  );

  t.equal(noAccess.status, 403, "Returns forbidden status");
  t.false(createFromTemplateStub.called, "Does not call create design stub");

  createFromTemplateStub.resetHistory();
  const [draft] = await post(`/product-designs/templates/a-template-id`, {
    headers: authHeader("a-session-id"),
  });

  t.equal(draft.status, 201, "Returns success status");
  t.deepEqual(
    createFromTemplateStub.args[0][1],
    {
      isPhidias: false,
      newCreatorId: "a-user-id",
      templateDesignId: "a-template-id",
      collectionId: null,
    },
    "calls create design from template with correct values"
  );

  createFromTemplateStub.resetHistory();
  sessionStub.resolves({
    id: "a-session-id",
    role: "ADMIN",
    userId: "an-admin-user-id",
  });
  const [admin] = await post(
    `/product-designs/templates/a-template-id?collectionId=a-collection-id`,
    {
      headers: authHeader("a-session-id"),
    }
  );

  t.equal(admin.status, 201, "Returns success status");
  t.deepEqual(
    createFromTemplateStub.args[0][1],
    {
      isPhidias: false,
      newCreatorId: "an-admin-user-id",
      templateDesignId: "a-template-id",
      collectionId: "a-collection-id",
    },
    "calls create design from template with correct values"
  );
});
