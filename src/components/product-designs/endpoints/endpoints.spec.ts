import { pick } from "lodash";
import { test, Test } from "../../../test-helpers/fresh";
import createUser from "../../../test-helpers/create-user";
import { authHeader, post } from "../../../test-helpers/http";
import { generateDesign } from "../../../test-helpers/factories/product-design";
import createCollectionDesign from "../../../test-helpers/factories/collection-design";

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

test("DesignAndEnvironment returns design and collection", async (t: Test) => {
  const { session, user } = await createUser();
  const { design, collection } = await createCollectionDesign(user.id);

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
      },
    },
  });
});
