import SessionsDAO from "../../../dao/sessions";
import { authHeader, post } from "../../../test-helpers/http";
import { sandbox, test, Test } from "../../../test-helpers/fresh";
import * as CreateDesignService from "../../../services/create-design";
import * as GetPermissionsService from "../../../services/get-permissions";
import * as UsersDAO from "../../users/dao";
import { staticProductDesign } from "../../../test-helpers/factories/product-design";

test("POST /product-designs", async (t: Test) => {
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
});
