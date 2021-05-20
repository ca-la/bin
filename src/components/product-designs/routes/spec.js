"use strict";

const uuid = require("node-uuid");
const { omit } = require("lodash");

const db = require("../../../services/db");
const CollectionsDAO = require("../../collections/dao");
const createUser = require("../../../test-helpers/create-user");
const DesignEventsDAO = require("../../../components/design-events/dao");
const createDesign = require("../../../services/create-design").default;
const generateCollection = require("../../../test-helpers/factories/collection")
  .default;
const { generateTeam } = require("../../../test-helpers/factories/team");
const {
  generateTeamUser,
} = require("../../../test-helpers/factories/team-user");
const TeamUserRole = require("../../team-users/types").Role;

const EmailService = require("../../../services/email");
const { authHeader, get, patch, post } = require("../../../test-helpers/http");
const { test, sandbox } = require("../../../test-helpers/fresh");
const AWSService = require("../../../services/aws");
const { addDesign } = require("../../../test-helpers/collections");

test("PATCH /product-designs/:id rejects empty data", (t) => {
  let designId;
  let sessionId;

  return createUser()
    .then(({ user, session }) => {
      sessionId = session.id;

      return createDesign({
        userId: user.id,
      });
    })
    .then((design) => {
      designId = design.id;

      return patch(`/product-designs/${designId}`, {
        headers: authHeader(sessionId),
        body: {},
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 400);
      t.equal(body.message, "No data provided");
    });
});

test("PATCH /product-designs/:id allows certain params, rejects others", (t) => {
  let designId;
  let sessionId;

  return createUser()
    .then(({ session }) => {
      sessionId = session.id;

      return post("/product-designs", {
        headers: authHeader(sessionId),
        body: {
          title: "Unchanged",
        },
      });
    })
    .then((response) => {
      designId = response[1].id;

      return patch(`/product-designs/${designId}`, {
        headers: authHeader(sessionId),
        body: {
          title: "Fizz Buzz",
          productType: "TEESHIRT",
          showPricingBreakdown: true,
        },
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.equal(body.productType, "TEESHIRT");
      t.equal(body.title, "Fizz Buzz");
      t.equal(body.showPricingBreakdown, true);
      t.equal(body.role, "OWNER");
    });
});

test("PATCH /product-designs/:id allows admins to update a wider range of keys", (t) => {
  let designId;
  let sessionId;

  return createUser({ role: "ADMIN" })
    .then(({ user, session }) => {
      sessionId = session.id;

      return createDesign({
        userId: user.id,
      });
    })
    .then((design) => {
      designId = design.id;

      return patch(`/product-designs/${designId}`, {
        headers: authHeader(sessionId),
        body: {
          title: "Fizz Buzz",
          showPricingBreakdown: true,
          overridePricingTable: {
            profit: {
              unitProfitCents: 1234,
            },
          },
        },
      });
    })
    .then(([response, body]) => {
      t.equal(response.status, 200);
      t.equal(body.title, "Fizz Buzz");
      t.equal(body.showPricingBreakdown, true);
      t.equal(body.overridePricingTable.profit.unitProfitCents, 1234);
    });
});

test("PATCH /product-designs/:id doesn't allow to provide title as empty string", async (t) => {
  const { user, session } = await createUser({ role: "ADMIN" });

  const design = await createDesign({
    userId: user.id,
    title: "Thing One",
  });

  const [response, body] = await patch(`/product-designs/${design.id}`, {
    headers: authHeader(session.id),
    body: {
      title: "",
    },
  });

  t.equal(response.status, 400, "empty title is not allowed");
  t.equal(body.message, "Design title cannot be an empty string");
});

test("GET /product-designs allows searching", async (t) => {
  sandbox().stub(EmailService, "enqueueSend").returns(Promise.resolve());

  const { user, session } = await createUser({ role: "ADMIN" });

  const first = await createDesign({
    userId: user.id,
    title: "Thing One",
  });

  await createDesign({
    userId: user.id,
    title: "Bzzt Two",
  });

  const third = await createDesign({
    userId: user.id,
    title: "Thing Three",
  });

  const [response, body] = await get("/product-designs?search=thing", {
    headers: authHeader(session.id),
  });

  t.equal(response.status, 200);
  t.equal(body.length, 2);

  t.deepEqual([body[0].id, body[1].id].sort(), [first.id, third.id].sort());
});

test("GET /product-designs allows fetching designs await quotes", async (t) => {
  const { user, session } = await createUser({ role: "ADMIN" });
  const first = await createDesign({
    userId: user.id,
    title: "Thing One",
  });
  const second = await createDesign({
    userId: user.id,
    title: "Bzzt Two",
  });
  const events = [
    {
      actorId: user.id,
      bidId: null,
      createdAt: new Date(2012, 11, 23),
      designId: first.id,
      id: uuid.v4(),
      targetId: null,
      type: "SUBMIT_DESIGN",
      targetTeamId: null,
      quoteId: null,
      approvalStepId: null,
      approvalSubmissionId: null,
      commentId: null,
      taskTypeId: null,
      shipmentTrackingId: null,
      shipmentTrackingEventId: null,
    },
    {
      actorId: user.id,
      bidId: null,
      createdAt: new Date(2012, 11, 23),
      designId: second.id,
      id: uuid.v4(),
      targetId: null,
      type: "SUBMIT_DESIGN",
      targetTeamId: null,
      quoteId: null,
      approvalStepId: null,
      approvalSubmissionId: null,
      commentId: null,
      taskTypeId: null,
      shipmentTrackingId: null,
      shipmentTrackingEventId: null,
    },
    {
      actorId: user.id,
      bidId: null,
      createdAt: new Date(2012, 11, 25),
      designId: second.id,
      id: uuid.v4(),
      targetId: user.id,
      type: "BID_DESIGN",
      targetTeamId: null,
      quoteId: null,
      approvalStepId: null,
      approvalSubmissionId: null,
      commentId: null,
      taskTypeId: null,
      shipmentTrackingId: null,
      shipmentTrackingEventId: null,
    },
  ];
  await db.transaction((trx) => DesignEventsDAO.createAll(trx, events));

  const [response, needsQuote] = await get(
    "/product-designs?limit=20&offset=0&needsQuote=true",
    {
      headers: authHeader(session.id),
    }
  );

  t.equal(response.status, 200);
  t.deepEqual(needsQuote, [
    {
      ...first,
      owner: {
        ...omit(user, ["passwordHash"]),
        createdAt: new Date(user.createdAt).toISOString(),
      },
      createdAt: new Date(first.createdAt).toISOString(),
      role: "OWNER",
      permissions: {
        canComment: true,
        canDelete: true,
        canEdit: true,
        canEditTitle: true,
        canEditVariants: true,
        canSubmit: true,
        canView: true,
      },
    },
  ]);
});

test("GET /product-designs allows fetching designs by user and returns correct permissions", async (t) => {
  const { user, session } = await createUser();

  // draft design without special collection/team
  await createDesign({
    userId: user.id,
    title: "Draft design",
  });

  // design in the collection user is not a member of
  const design2 = await createDesign({
    userId: user.id,
    title: "Design in the collection user is not a member of",
  });
  const { collection: randomCollection } = await generateCollection();
  await addDesign(randomCollection.id, design2.id);

  // design within the team and user is an EDITOR team member
  const teamOwner = await createUser();
  const { team } = await generateTeam(teamOwner.user.id);
  const { collection } = await generateCollection({ teamId: team.id });
  await generateTeamUser({
    teamId: team.id,
    userId: user.id,
    role: TeamUserRole.EDITOR,
  });
  const design3 = await createDesign({
    userId: user.id,
    title: "Bzzt Three",
  });
  await addDesign(collection.id, design3.id);

  const [response, body] = await get(
    `/product-designs?userId=${user.id}&sortBy=created_at:asc`,
    {
      headers: authHeader(session.id),
    }
  );

  t.equal(response.status, 200);
  t.deepEqual(
    body[0].permissions,
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "full owner access to a draft design"
  );

  t.deepEqual(
    body[1].permissions,
    {
      canComment: true,
      canDelete: false,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "owner permissions without canDelete as user is not a member of the team"
  );

  t.deepEqual(
    body[2].permissions,
    {
      canComment: true,
      canDelete: true,
      canEdit: true,
      canEditTitle: true,
      canEditVariants: true,
      canSubmit: true,
      canView: true,
    },
    "full permissions as user is a member of the team with EDITOR role"
  );
});

test("GET /product-designs/:designId/upload-policy/:sectionId", async (t) => {
  const { user, session } = await createUser({ role: "ADMIN" });

  const design = await createDesign({
    userId: user.id,
    title: "Design",
  });
  const sectionId = uuid.v4();

  sandbox()
    .stub(AWSService, "getThumbnailUploadPolicy")
    .returns(
      Promise.resolve({
        url: "stub url",
        fields: {
          "x-aws-foo": "bar",
        },
      })
    );

  const [response, body] = await get(
    `/product-designs/${design.id}/upload-policy/${sectionId}`,
    {
      headers: authHeader(session.id),
    }
  );

  t.equal(response.status, 200);
  t.deepEqual(body, {
    remoteFileName: sectionId,
    uploadUrl: "stub url",
    downloadUrl: `https://svgthumb-uploads-dev.s3.amazonaws.com/${sectionId}`,
    formData: {
      "x-aws-foo": "bar",
    },
  });
});

test("GET /product-designs/:designId/collections returns collections", async (t) => {
  const { user, session } = await createUser({ role: "ADMIN" });

  const collection = await CollectionsDAO.create({
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: null,
    description: "Cool Collection",
    id: uuid.v4(),
    teamId: null,
    title: "Virgil Drop",
  });
  const design = await createDesign({
    userId: user.id,
    title: "Design",
  });
  await addDesign(collection.id, design.id);

  const [response, body] = await get(
    `/product-designs/${design.id}/collections`,
    {
      headers: authHeader(session.id),
    }
  );

  t.equal(response.status, 200);
  t.equal(body.length, 1, "Returns the collection");
  const responseCollection = body[0];
  t.deepEqual(
    responseCollection.id,
    collection.id,
    "Returns the same collection"
  );
});

test("GET /product-designs/:designId returns 404 if not found", async (t) => {
  const { session } = await createUser();

  const [response, body] = await get(
    "/product-designs/00000000-0000-0000-0000-000000000000",
    {
      headers: authHeader(session.id),
    }
  );

  t.equal(response.status, 404);
  t.equal(body.message, "Design not found");
});
