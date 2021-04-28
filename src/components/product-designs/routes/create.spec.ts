import SessionsDAO from "../../../dao/sessions";
import { authHeader, post } from "../../../test-helpers/http";
import { sandbox, test, Test } from "../../../test-helpers/fresh";
import * as CreateDesignService from "../../../services/create-design";
import * as GetPermissionsService from "../../../services/get-permissions";
import * as UsersDAO from "../../users/dao";
import * as CollectionsDAO from "../../collections/dao";
import TeamUsersDAO from "../../team-users/dao";
import { Role as TeamUserRole } from "../../team-users/types";
import { staticProductDesign } from "../../../test-helpers/factories/product-design";

test("POST /product-designs: team collection", async (t: Test) => {
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
  sandbox().stub(SessionsDAO, "findById").resolves({
    id: "a-session-id",
    role: "USER",
    userId: "a-user-id",
  });
  const createDesignStub = sandbox()
    .stub(CreateDesignService, "default")
    .resolves(design);
  sandbox()
    .stub(GetPermissionsService, "getDesignPermissions")
    .resolves(permissions);
  sandbox().stub(UsersDAO, "findById").resolves(owner);
  sandbox().stub(CollectionsDAO, "findById").resolves({
    id: "a-collection-id",
    teamId: "a-team-id",
  });
  const findTeamUserStub = sandbox().stub(TeamUsersDAO, "findOne").resolves({
    id: "a-team-user-id",
    role: TeamUserRole.ADMIN,
    user: "a-user-id",
  });

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
  const [nonTeamMember] = await post(`/product-designs`, {
    headers: authHeader("a-session-id"),
    body: {
      title: "A design",
      collectionIds: ["a-collection-id"],
    },
  });

  t.equal(
    nonTeamMember.status,
    403,
    "Non team members cannot create team designs"
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
});

test("POST /product-designs: draft", async (t: Test) => {
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
  sandbox().stub(SessionsDAO, "findById").resolves({
    id: "a-session-id",
    role: "USER",
    userId: "a-user-id",
  });
  const createDesignStub = sandbox()
    .stub(CreateDesignService, "default")
    .resolves(design);
  sandbox()
    .stub(GetPermissionsService, "getDesignPermissions")
    .resolves(permissions);
  sandbox().stub(UsersDAO, "findById").resolves(owner);

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
