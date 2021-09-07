import { pick } from "lodash";
import db from "../../services/db";

import uuid from "node-uuid";
import { test, Test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";
import { authHeader, post } from "../../test-helpers/http";
import { generateDesign } from "../../test-helpers/factories/product-design";
import generateCollection from "../../test-helpers/factories/collection";
import { generateTeam } from "../../test-helpers/factories/team";
import generateCanvas from "../../test-helpers/factories/product-design-canvas";
import * as AnnotationCommentsDAO from "../annotation-comments/dao";
import { AnnotationInput } from "./graphql-types";
import { Role } from "../team-users/types";

const annotationInput: AnnotationInput = {
  id: uuid.v4(),
  canvasId: "c1",
  x: 1,
  y: 1,
  commentText: "abc",
};

function buildRequest(annotation: AnnotationInput) {
  return {
    query: `mutation ($annotation: AnnotationInput) {
      CreateAnnotation(annotation: $annotation) {
        id
        x
        y
      }
    }`,
    variables: {
      annotation,
    },
  };
}

test("CreateAnnotation needs authentication", async (t: Test) => {
  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest(annotationInput),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(forbiddenBody.errors[0].message, "Unauthorized");
});

test("CreateAnnotation is forbidden for arbitrary user", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const { session } = await createUser();

  const design = await generateDesign({ userId: user.id });
  const { canvas } = await generateCanvas({ designId: design.id });

  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest({ ...annotationInput, canvasId: canvas.id }),
    headers: authHeader(session.id),
  });

  t.equal(forbiddenResponse.status, 200);
  t.equal(
    forbiddenBody.errors[0].message,
    "Not authorized to edit this design"
  );
});

test("CreateAnnotation is forbidden for viewer", async (t: Test) => {
  const { user: owner } = await createUser({ withSession: false });
  const { user, session } = await createUser();

  const { team } = await generateTeam(
    owner.id,
    {},
    {
      role: Role.VIEWER,
      userId: user.id,
    }
  );
  const { collection } = await generateCollection({ teamId: team.id });
  const design = await generateDesign({
    userId: owner.id,
    collectionIds: [collection.id],
  });
  const { canvas } = await generateCanvas({ designId: design.id });

  const [forbiddenResponse, forbiddenBody] = await post("/v2", {
    body: buildRequest({ ...annotationInput, canvasId: canvas.id }),
    headers: authHeader(session.id),
  });
  t.equal(forbiddenResponse.status, 200);
  t.equal(
    forbiddenBody.errors[0].message,
    "Not authorized to edit this design"
  );
});

test("CreateAnnotation returns annotation and creates a comment", async (t: Test) => {
  const { user: owner } = await createUser({ withSession: false });
  const { user, session } = await createUser();

  const { team } = await generateTeam(
    owner.id,
    {},
    {
      role: Role.EDITOR,
      userId: user.id,
    }
  );
  const { collection } = await generateCollection({ teamId: team.id });
  const design = await generateDesign({
    userId: owner.id,
    collectionIds: [collection.id],
  });
  const { canvas } = await generateCanvas({ designId: design.id });
  const [response, body] = await post("/v2", {
    body: buildRequest({ ...annotationInput, canvasId: canvas.id }),
    headers: authHeader(session.id),
  });

  t.equal(response.status, 200);
  t.deepEqual(body, {
    data: {
      CreateAnnotation: pick(annotationInput, "id", "x", "y"),
    },
  });

  const comments = await AnnotationCommentsDAO.findByAnnotationId(db, {
    annotationId: annotationInput.id,
  });
  t.equal(comments.length, 1, "should create exactly 1 comment");

  t.deepEqual(pick(comments[0], "annotationId", "text", "userId"), {
    annotationId: annotationInput.id,
    text: annotationInput.commentText,
    userId: user.id,
  });
});
