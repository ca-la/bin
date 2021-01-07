import tape from "tape";

import EmailService = require("../../../services/email");
import SessionsDAO from "../../../dao/sessions";
import TeamUsersDAO from "../../team-users/dao";
import * as TaskEventsDAO from "../../../dao/task-events";
import * as CollaboratorsDAO from "../../collaborators/dao";
import * as ProductDesignStagesDAO from "../../../dao/product-design-stages";
import * as ProductDesignsDAO from "../dao/dao";

import { authHeader, get } from "../../../test-helpers/http";
import { sandbox, test } from "../../../test-helpers/fresh";
import createUser = require("../../../test-helpers/create-user");
import createDesign from "../../../services/create-design";

test("GET /product-designs allows getting designs", async (t: tape.Test) => {
  const { user, session } = await createUser({ role: "USER" });
  sandbox().stub(EmailService, "enqueueSend").returns(Promise.resolve());

  const design = await createDesign({
    productType: "SHIRT",
    title: "Designer Silk Shirt",
    userId: user.id,
  });

  const [response, body] = await get(`/product-designs?userId=${user.id}`, {
    headers: authHeader(session.id),
  });

  t.equal(response.status, 200);
  t.equal(body[0].id, design.id);
});

test("GET /product-designs allows getting tasks", async (t: tape.Test) => {
  const { user, session } = await createUser({ role: "ADMIN" });
  sandbox().stub(EmailService, "enqueueSend").returns(Promise.resolve());
  sandbox()
    .stub(TaskEventsDAO, "findByStageId")
    .returns(Promise.resolve([{ id: "task1234" }]));
  sandbox()
    .stub(CollaboratorsDAO, "findByTask")
    .returns(Promise.resolve([{ id: "collaborator1234" }]));
  sandbox()
    .stub(ProductDesignStagesDAO, "findAllByDesignId")
    .returns(Promise.resolve([{ id: "stage1234", title: "stage title" }]));

  const design = await createDesign({
    productType: "SHIRT",
    title: "Designer Silk Shirt",
    userId: user.id,
  });

  const [response, body] = await get(
    `/product-designs?userId=${user.id}&tasks=true`,
    {
      headers: authHeader(session.id),
    }
  );

  t.equal(response.status, 200);
  t.equal(body[0].id, design.id);
  t.equal(body[0].stages[0].id, "stage1234");
  t.equal(body[0].stages[0].tasks[0].id, "task1234");
  t.equal(body[0].stages[0].tasks[0].assignees[0].id, "collaborator1234");
});

test("GET /product-designs?search with malformed RegExp throws 400", async (t: tape.Test) => {
  const { session } = await createUser({ role: "ADMIN" });
  sandbox().stub(EmailService, "enqueueSend").returns(Promise.resolve());

  const [response, body] = await get("/product-designs?search=(", {
    headers: authHeader(session.id),
  });

  t.equal(response.status, 400);
  t.deepEqual(body, { message: "Search contained invalid characters" });
});

test("GET /product-designs allows filtering by collection", async (t: tape.Test) => {
  const { user, session } = await createUser({ role: "USER" });

  const getDesignsStub = sandbox()
    .stub(ProductDesignsDAO, "findAllDesignsThroughCollaborator")
    .resolves([]);

  const [response] = await get(
    `/product-designs?userId=${user.id}&collectionFilterId=*`,
    {
      headers: authHeader(session.id),
    }
  );
  t.equal(response.status, 200);
  t.deepEqual(getDesignsStub.args[0][0].filters, [
    {
      type: "COLLECTION",
      value: "*",
    },
  ]);
});

test("GET /product-designs allows filtering by team", async (t: tape.Test) => {
  const sessionStub = sandbox().stub(SessionsDAO, "findById").resolves({
    role: "USER",
    userId: "a-user-id",
  });
  const teamUserStub = sandbox().stub(TeamUsersDAO, "findOne").resolves({
    teamId: "a-team-id",
    userId: "a-user-id",
  });

  const getDesignsStub = sandbox()
    .stub(ProductDesignsDAO, "findAllDesignsThroughCollaborator")
    .resolves([]);

  const [response] = await get(
    "/product-designs?userId=a-user-id&teamId=a-team-id",
    {
      headers: authHeader("a-session-id"),
    }
  );
  t.equal(response.status, 200, "succeeds for own user");
  t.deepEqual(
    getDesignsStub.args[0][0].filters,
    [
      {
        type: "TEAM",
        value: "a-team-id",
      },
    ],
    "calls DAO with correct arguments"
  );

  const [differentUser] = await get(
    "/product-designs?userId=a-different-user-id&teamId=a-team-id",
    {
      headers: authHeader("a-session-id"),
    }
  );
  t.equal(differentUser.status, 403, "fails for using a different user");

  teamUserStub.resolves(null);
  const [notTeamMember] = await get(
    "/product-designs?userId=a-user-id&teamId=a-team-id",
    {
      headers: authHeader("a-session-id"),
    }
  );
  t.equal(notTeamMember.status, 403, "fails when not a member of the team");

  sessionStub.resolves({
    role: "ADMIN",
    userId: "an-admin-user-id",
  });
  const [admin] = await get(
    "/product-designs?userId=a-different-user-id&teamId=a-team-id",
    {
      headers: authHeader("a-session-id"),
    }
  );
  t.equal(
    admin.status,
    200,
    "succeeds for different user if they are an admin"
  );
});
