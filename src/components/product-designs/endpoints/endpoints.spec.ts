import { pick } from "lodash";
import { test, Test, sandbox } from "../../../test-helpers/fresh";
import createUser from "../../../test-helpers/create-user";
import { authHeader, post } from "../../../test-helpers/http";
import { generateDesign } from "../../../test-helpers/factories/product-design";
import createCollectionDesign from "../../../test-helpers/factories/collection-design";
import generateCanvas from "../../../test-helpers/factories/product-design-canvas";
import * as ProductDesignsDAO from "../dao/dao";

function buildRequest(designId: string) {
  return {
    query: `query ($designId: String) {
      DesignAndEnvironment(designId: $designId) {
        designId,
        design {
          id
          title
        }
        collection {
          id
          title
        }
        canvases {
          id
          title
        }
      }
    }`,
    variables: {
      designId,
    },
  };
}

test("DesignAndEnvironment needs authentication", async (t: Test) => {
  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest("d1"),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(forbiddenBody.errors[0].message, "Unauthorized");
});

test("DesignAndEnvironment is forbidden for arbitrary user", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { session } = await createUser();
  const design = await generateDesign({ userId: user.id });

  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest(design.id),
    headers: authHeader(session.id),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(
    forbiddenBody.errors[0].message,
    "Not authorized to view this design"
  );
});

test("DesignAndEnvironment returns design, collection and canvases", async (t: Test) => {
  const { session, user } = await createUser();
  const { design, collection } = await createCollectionDesign(user.id);
  const { canvas: canvas1 } = await generateCanvas({
    designId: design.id,
    title: "canvas 1",
  });
  const { canvas: canvas2 } = await generateCanvas({
    designId: design.id,
    title: "canvas 2",
  });

  const [response, body] = await post("/v2", {
    body: buildRequest(design.id),
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(body, {
    data: {
      DesignAndEnvironment: {
        designId: design.id,
        design: pick(design, "id", "title"),
        collection: pick(collection, "id", "title"),
        canvases: [pick(canvas1, "id", "title"), pick(canvas2, "id", "title")],
      },
    },
  });
});

test("GetProductDesignList: valid: no arguments", async (t: Test) => {
  const { session, user } = await createUser();
  const { design, collection } = await createCollectionDesign(user.id);

  const [response, body] = await post("/v2", {
    body: {
      operationName: "pd",
      query: `query pd {
        productDesigns {
          id
          title
          collections {
            id
            title
          }
        }
      }`,
    },
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(body, {
    data: {
      productDesigns: [
        {
          id: design.id,
          title: design.title,
          collections: [{ id: collection.id, title: collection.title }],
        },
      ],
    },
  });
});

test("GetProductDesignList: valid: offset/limit", async (t: Test) => {
  const { session, user } = await createUser();
  await createCollectionDesign(user.id);

  const [response, body] = await post("/v2", {
    body: {
      operationName: "pd",
      query: `query pd($limit: Int!, $offset: Int!) {
        productDesigns(limit: $limit, offset: $offset) {
          id
          title
          collections {
            id
            title
          }
        }
      }`,
      variables: {
        limit: 1,
        offset: 20,
      },
    },
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(body, {
    data: {
      productDesigns: [],
    },
  });
});

test("GetProductDesignList: valid: offset/limit with valid filters", async (t: Test) => {
  const findDesignsStub = sandbox()
    .stub(ProductDesignsDAO, "findAllDesignsThroughCollaboratorAndTeam")
    .resolves([]);
  const { session, user } = await createUser();
  await createCollectionDesign(user.id);

  const [response, body] = await post("/v2", {
    body: {
      operationName: "pd",
      query: `query pd($limit: Int!, $offset: Int!, $filters: [DesignFilter]!) {
        productDesigns(limit: $limit, offset: $offset, filters: $filters) {
          id
          title
          collections {
            id
            title
          }
        }
      }`,
      variables: {
        limit: 1,
        offset: 20,
        filters: [{ type: "TEAM", value: "a-team-id" }],
      },
    },
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(body, {
    data: {
      productDesigns: [],
    },
  });

  t.deepEqual(findDesignsStub.args, [
    [
      {
        filters: [{ type: "TEAM", value: "a-team-id" }],
        limit: 1,
        offset: 20,
        userId: user.id,
      },
    ],
  ]);
});

test("GetProductDesignList: invalid: invalid filters", async (t: Test) => {
  const findDesignsStub = sandbox()
    .stub(ProductDesignsDAO, "findAllDesignsThroughCollaboratorAndTeam")
    .resolves([]);
  const { session, user } = await createUser();
  await createCollectionDesign(user.id);

  const [response, body] = await post("/v2", {
    body: {
      operationName: "pd",
      query: `query pd($limit: Int!, $offset: Int!, $filters: [DesignFilter]!) {
        productDesigns(limit: $limit, offset: $offset, filters: $filters) {
          id
          title
          collections {
            id
            title
          }
        }
      }`,
      variables: {
        limit: 1,
        offset: 20,
        filters: [
          { type: "unknown filter type", value: "valid graphql, invalid zod" },
        ],
      },
    },
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.equal(body.data.productDesigns, null, "returns null data");
  t.equal(
    body.errors[0].extensions.code,
    "BAD_USER_INPUT",
    "returns correct code"
  );
  t.equal(body.errors[0].message, "Invalid query arguments");
  t.deepEqual(findDesignsStub.args, []);
});

test("GetProductDesignList: invalid: negative offset", async (t: Test) => {
  const findDesignsStub = sandbox()
    .stub(ProductDesignsDAO, "findAllDesignsThroughCollaboratorAndTeam")
    .resolves([]);
  const { session, user } = await createUser();
  await createCollectionDesign(user.id);

  const [response, body] = await post("/v2", {
    body: {
      operationName: "pd",
      query: `query pd($limit: Int!, $offset: Int!, $filters: [DesignFilter]!) {
        productDesigns(limit: $limit, offset: $offset, filters: $filters) {
          id
          title
          collections {
            id
            title
          }
        }
      }`,
      variables: {
        limit: 1,
        offset: -1,
        filters: [],
      },
    },
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.equal(body.data.productDesigns, null, "returns null data");
  t.equal(
    body.errors[0].extensions.code,
    "BAD_USER_INPUT",
    "returns correct code"
  );
  t.equal(body.errors[0].message, "Invalid query arguments");
  t.deepEqual(findDesignsStub.args, []);
});

test("GetProductDesignList: invalid: negative limit", async (t: Test) => {
  const findDesignsStub = sandbox()
    .stub(ProductDesignsDAO, "findAllDesignsThroughCollaboratorAndTeam")
    .resolves([]);
  const { session, user } = await createUser();
  await createCollectionDesign(user.id);

  const [response, body] = await post("/v2", {
    body: {
      operationName: "pd",
      query: `query pd($limit: Int!, $offset: Int!, $filters: [DesignFilter]!) {
        productDesigns(limit: $limit, offset: $offset, filters: $filters) {
          id
          title
          collections {
            id
            title
          }
        }
      }`,
      variables: {
        limit: -1,
        offset: 0,
        filters: [],
      },
    },
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.equal(body.data.productDesigns, null, "returns null data");
  t.equal(
    body.errors[0].extensions.code,
    "BAD_USER_INPUT",
    "returns correct code"
  );
  t.equal(body.errors[0].message, "Invalid query arguments");
  t.deepEqual(findDesignsStub.args, []);
});
