import uuid from "node-uuid";
import Knex from "knex";

import createUser from "../../../test-helpers/create-user";
import { authHeader, post } from "../../../test-helpers/http";
import { sandbox, test, Test } from "../../../test-helpers/fresh";
import db from "../../../services/db";
import createDesign from "../../../services/create-design";
import { createList as createTemplateDesigns } from "../../templates/designs/dao";
import ProductDesign = require("../domain-objects/product-design");
import { omit } from "lodash";
import generateNode, { staticNode } from "../../../test-helpers/factories/node";
import {
  createDesignRoot,
  findNodeTrees,
  findRootNodesByDesign,
} from "../../nodes/dao";
import * as CreationService from "../../templates/services/create-from-design-template";

test("POST /product-designs/templates/:templateDesignId returns a 401 if not logged in", async (t: Test) => {
  const templateDesignId = uuid.v4();

  const [response, body] = await post(
    `/product-designs/templates/${templateDesignId}`
  );

  t.equal(response.status, 401);
  t.deepEqual(body, {
    message: "Authorization is required to access this resource",
  });
});

test("POST /product-designs/templates/:templateDesignId returns a 400 if resource is not found", async (t: Test) => {
  const { session } = await createUser();
  const templateDesignId = uuid.v4();

  const [response, body] = await post(
    `/product-designs/templates/${templateDesignId}`,
    {
      headers: authHeader(session.id),
    }
  );

  t.equal(response.status, 400);
  t.deepEqual(body, {
    message: `Template for design "${templateDesignId}" does not exist.`,
  });
});

test("POST /product-designs/templates/:templateDesignId returns a duplicate preview tool design", async (t: Test) => {
  const { user: u2 } = await createUser({ withSession: false, role: "ADMIN" });
  const { session, user } = await createUser();

  const design = await db.transaction(
    async (trx: Knex.Transaction): Promise<ProductDesign> => {
      const newDesign = await createDesign(
        {
          productType: "SHIRT",
          title: "My Shirt",
          userId: u2.id,
        },
        trx
      );
      await createTemplateDesigns(
        [{ designId: newDesign.id, templateCategoryId: null }],
        trx
      );
      return newDesign;
    }
  );

  const creationSpy = sandbox().spy(CreationService, "default");

  const [response, body] = await post(
    `/product-designs/templates/${design.id}`,
    { headers: authHeader(session.id) }
  );

  t.equal(response.status, 201);
  t.deepEqual(
    omit(body, "createdAt", "id"),
    omit(
      {
        ...design,
        userId: user.id,
      },
      "createdAt",
      "id"
    )
  );

  t.equal(creationSpy.callCount, 1);
  t.deepEqual(creationSpy.args[0][0], {
    isPhidias: false,
    newCreatorId: user.id,
    templateDesignId: design.id,
  });
});

test("POST /product-designs/templates/:templateDesignId?isPhidias=true returns a duplicate design based off the template", async (t: Test) => {
  const { user: u2 } = await createUser({ withSession: false, role: "ADMIN" });
  const { session, user } = await createUser();
  const rootNode = staticNode({ createdBy: u2.id, title: "node-0" });

  const design = await db.transaction(
    async (trx: Knex.Transaction): Promise<ProductDesign> => {
      const newDesign = await createDesign(
        {
          productType: "SHIRT",
          title: "My Shirt",
          userId: u2.id,
        },
        trx
      );
      await createTemplateDesigns(
        [{ designId: newDesign.id, templateCategoryId: null }],
        trx
      );
      const root = await createDesignRoot(rootNode, newDesign.id, trx);
      const { node: n1 } = await generateNode(
        { parentId: root.id, title: "node-1" },
        trx
      );
      await generateNode({ parentId: root.id, title: "node-2" }, trx);
      await generateNode({ parentId: n1.id, title: "node-3" }, trx);

      return newDesign;
    }
  );

  const [response, body] = await post(
    `/product-designs/templates/${design.id}?isPhidias=true`,
    {
      headers: authHeader(session.id),
    }
  );

  t.equal(response.status, 201);
  t.deepEqual(
    omit(body, "createdAt", "id"),
    omit(
      {
        ...design,
        userId: user.id,
      },
      "createdAt",
      "id"
    )
  );

  const resultRoot = await findRootNodesByDesign(body.id);
  t.equal(resultRoot.length, 1);
  t.notEqual(resultRoot[0].id, rootNode.id);
  t.notEqual(resultRoot[0].createdAt, rootNode.createdAt);
  t.deepEqual(
    omit(resultRoot[0], "id", "createdAt"),
    omit({ ...rootNode, createdBy: user.id }, "id", "createdAt"),
    "Returns a duplicated version of the root node"
  );

  const dupeRoots = await findNodeTrees([resultRoot[0].id]);
  t.equal(dupeRoots.length, 4);
});
