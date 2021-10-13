import { pick } from "lodash";
import { test, Test } from "../../../test-helpers/fresh";
import createUser from "../../../test-helpers/create-user";
import { authHeader, post } from "../../../test-helpers/http";
import generateCollection from "../../../test-helpers/factories/collection";
import createCollectionDesign from "../../../test-helpers/factories/collection-design";

function buildRequest(collectionId: string) {
  return {
    query: `query ($collectionId: String!) {
      CollectionAndEnvironment(collectionId: $collectionId) {
        collectionId
        collection {
          id
          title
        }
        designs {
          id
          previewImageUrls
          collections {
            id
            title
          }
        }
      }
    }`,
    variables: {
      collectionId,
    },
  };
}

test("CollectionAndEnvironment needs authentication", async (t: Test) => {
  const { collection } = await generateCollection();
  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest(collection.id),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(forbiddenBody.errors[0].message, "Unauthorized");
});

test("CollectionAndEnvironment is forbidden for arbitrary user", async (t: Test) => {
  const { collection } = await generateCollection();
  const { session } = await createUser();

  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest(collection.id),
    headers: authHeader(session.id),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(
    forbiddenBody.errors[0].message,
    "You don't have permission to view this collection"
  );
});

test("CollectionAndEnvironment returns collection and designs", async (t: Test) => {
  const { session, user } = await createUser();
  const { collection, design } = await createCollectionDesign(user.id);

  const [response, body] = await post("/v2", {
    body: buildRequest(collection.id),
    headers: authHeader(session.id),
  });
  t.equal(response.status, 200);
  t.deepEqual(body, {
    data: {
      CollectionAndEnvironment: {
        collectionId: collection.id,
        collection: pick(collection, "id", "title"),
        designs: [
          {
            id: design.id,
            previewImageUrls: [],
            collections: [pick(collection, "id", "title")],
          },
        ],
      },
    },
  });
});
