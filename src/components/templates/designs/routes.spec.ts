import API from "../../../test-helpers/http";
import { sandbox, test, Test } from "../../../test-helpers/fresh";
import createUser = require("../../../test-helpers/create-user");
import * as TemplateDesignsDAO from "./dao";
import InvalidDataError = require("../../../errors/invalid-data");
import DesignsDAO from "../../product-designs/dao";
import * as DesignTemplateService from "../services/create-design-template";
import { staticProductDesign } from "../../../test-helpers/factories/product-design";

const API_PATH = "/templates/designs";

const d1 = JSON.parse(JSON.stringify(staticProductDesign()));
const d2 = JSON.parse(JSON.stringify(staticProductDesign()));

test(`PUT ${API_PATH}/:designId with an admin account`, async (t: Test) => {
  const admin = await createUser({ role: "ADMIN" });
  const createStub = sandbox()
    .stub(TemplateDesignsDAO, "createList")
    .resolves([
      {
        designId: "design-one",
        templateCategoryId: null,
      },
    ]);
  const findStub = sandbox().stub(DesignsDAO, "findByIds").resolves([d1]);

  const [response, body] = await API.put("/templates/designs/design-one", {
    headers: API.authHeader(admin.session.id),
  });

  t.equal(response.status, 201);
  t.deepEqual(body, d1);
  t.equal(createStub.callCount, 1);
  t.equal(findStub.callCount, 1);
});

test(`PUT ${API_PATH}/:designId without an admin account`, async (t: Test) => {
  const user = await createUser({ role: "USER" });

  const [response] = await API.put("/templates/designs/design-one", {
    headers: API.authHeader(user.session.id),
  });

  t.equal(response.status, 403);
});

test(`PUT ${API_PATH}/:designId fails with a known error`, async (t: Test) => {
  const admin = await createUser({ role: "ADMIN" });
  const createStub = sandbox()
    .stub(TemplateDesignsDAO, "createList")
    .rejects(new InvalidDataError("Foo"));

  const [response, body] = await API.put("/templates/designs/design-one", {
    headers: API.authHeader(admin.session.id),
  });

  t.equal(response.status, 400);
  t.deepEqual(body, { message: "Foo" });
  t.equal(createStub.callCount, 1);
});

test(`PUT ${API_PATH}/:designId fails with an unknown error`, async (t: Test) => {
  const admin = await createUser({ role: "ADMIN" });
  const createStub = sandbox()
    .stub(TemplateDesignsDAO, "createList")
    .rejects(new Error("Bizz Bazz"));

  const [response, body] = await API.put("/templates/designs/design-one", {
    headers: API.authHeader(admin.session.id),
  });

  t.equal(response.status, 500);
  t.deepEqual(body, {
    message:
      "Something went wrong! Please try again, or email hi@ca.la if this message persists.",
  });
  t.equal(createStub.callCount, 1);
});

test(`PUT ${API_PATH}?designIds= with an admin account`, async (t: Test) => {
  const admin = await createUser({ role: "ADMIN" });
  const createStub = sandbox()
    .stub(DesignTemplateService, "createDesignTemplates")
    .resolves([d1, d2]);

  const [response, body] = await API.put(
    "/templates/designs?designIds=design-one,design-two",
    {
      headers: API.authHeader(admin.session.id),
    }
  );

  t.equal(response.status, 201);
  t.deepEqual(body, [d1, d2]);
  t.equal(createStub.callCount, 1);
});

test(`DEL ${API_PATH}/:designId with an admin account`, async (t: Test) => {
  const admin = await createUser({ role: "ADMIN" });
  const removeStub = sandbox().stub(TemplateDesignsDAO, "remove").resolves({
    designId: "design-one",
  });

  const [response] = await API.del("/templates/designs/design-one", {
    headers: API.authHeader(admin.session.id),
  });

  t.equal(response.status, 204);
  t.equal(removeStub.callCount, 1);
});

test(`DEL ${API_PATH}/:designId without an admin account`, async (t: Test) => {
  const user = await createUser({ role: "USER" });
  const removeStub = sandbox().stub(TemplateDesignsDAO, "remove").resolves(1);

  const [response] = await API.del("/templates/designs/design-one", {
    headers: API.authHeader(user.session.id),
  });

  t.equal(response.status, 403);
  t.equal(removeStub.callCount, 0);
});

test(`DEL ${API_PATH}/:designId for non-existent resource`, async (t: Test) => {
  const admin = await createUser({ role: "ADMIN" });
  const removeStub = sandbox()
    .stub(TemplateDesignsDAO, "remove")
    .rejects(new InvalidDataError("Foo!"));

  const [response, body] = await API.del("/templates/designs/design-one", {
    headers: API.authHeader(admin.session.id),
  });

  t.equal(response.status, 404);
  t.deepEqual(body, { message: "Foo!" });
  t.equal(removeStub.callCount, 1);
});

test(`DEL ${API_PATH}?designIds= with an admin account`, async (t: Test) => {
  const admin = await createUser({ role: "ADMIN" });
  const removeListStub = sandbox()
    .stub(TemplateDesignsDAO, "removeList")
    .resolves(2);

  const [response] = await API.del(
    "/templates/designs?designIds=design-one,design-two",
    {
      headers: API.authHeader(admin.session.id),
    }
  );

  t.equal(response.status, 204);
  t.equal(removeListStub.callCount, 1);
});

test(`GET ${API_PATH}/ with a user account`, async (t: Test) => {
  const user = await createUser({ role: "USER" });
  const removeStub = sandbox()
    .stub(TemplateDesignsDAO, "getAll")
    .resolves([d1, d2]);

  const [response, body] = await API.get("/templates/designs", {
    headers: API.authHeader(user.session.id),
  });

  t.equal(response.status, 200);
  t.deepEqual(body, [d1, d2]);
  t.equal(removeStub.callCount, 1);
  t.deepEqual(removeStub.args[0][1], {
    limit: 20,
    offset: 0,
    templateCategoryIds: [],
  });
});

test(`GET ${API_PATH}/ with query parameters`, async (t: Test) => {
  const user = await createUser({ role: "USER" });
  const removeStub = sandbox()
    .stub(TemplateDesignsDAO, "getAll")
    .resolves([d1, d2]);

  const [response, body] = await API.get(
    "/templates/designs?limit=5&offset=20",
    {
      headers: API.authHeader(user.session.id),
    }
  );

  t.equal(response.status, 200);
  t.deepEqual(body, [d1, d2]);
  t.equal(removeStub.callCount, 1);
  t.deepEqual(removeStub.args[0][1], {
    limit: 5,
    offset: 20,
    templateCategoryIds: [],
  });
});
