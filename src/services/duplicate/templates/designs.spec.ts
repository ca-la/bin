import Knex from "knex";

import { sandbox, test, Test } from "../../../test-helpers/fresh";
import db from "../../../services/db";
import findAndDuplicateTemplateDesign from "./designs";
import * as NodesDAO from "../../../components/nodes/dao";
import * as NodeDuplicator from "../nodes";
import * as DesignCreator from "../../create-design";
import DesignsDAO = require("../../../components/product-designs/dao");
import { staticNode } from "../../../test-helpers/factories/node";
import { staticProductDesign } from "../../../test-helpers/factories/product-design";

const d1 = "9f6ce088-e5d3-46be-a930-732494afa200";
const d2 = "943d37a9-8e53-4aa9-ba05-19939292dba7";
const design = {
  ...staticProductDesign({
    id: d1,
  }),
  collectionIds: [],
};

test("findAndDuplicateTemplateDesign() empty node case", async (t: Test) => {
  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      const findDesignStub = sandbox()
        .stub(DesignsDAO, "findById")
        .resolves(design);
      const createDesignStub = sandbox()
        .stub(DesignCreator, "default")
        .resolves({ ...design, id: d2 });
      const findRootsStub = sandbox()
        .stub(NodesDAO, "findRootNodesByDesign")
        .resolves([]);
      const findTreesStub = sandbox()
        .stub(NodesDAO, "findNodeTrees")
        .resolves([]);
      const nodeDupeStub = sandbox()
        .stub(NodeDuplicator, "findAndDuplicateNode")
        .resolves({});

      const result = await findAndDuplicateTemplateDesign(
        trx,
        d1,
        "new-creator"
      );

      t.deepEqual(
        result,
        { ...design, id: d2 },
        "Returns the newly created design"
      );

      t.equal(findDesignStub.callCount, 1);

      t.deepEqual(findDesignStub.args[0][0], d1);
      t.equal(createDesignStub.callCount, 1);

      t.equal(findRootsStub.callCount, 1);
      t.deepEqual(findRootsStub.args[0][0], d1);

      t.equal(findTreesStub.callCount, 1);
      t.deepEqual(findTreesStub.args[0][0], []);

      t.equal(nodeDupeStub.callCount, 0);
    }
  );
});

test("findAndDuplicateTemplateDesign() empty node case", async (t: Test) => {
  const n1 = "c19c703d-dd89-46a9-87ce-390536034ada";
  const n2 = "3e5b7450-aa5c-4572-b72b-39771d4bba64";
  const n3 = "775127fc-44d2-4070-b65e-ad698f51b2ce";
  const node1 = staticNode({ id: n1 });
  const node2 = staticNode({ id: n2, parentId: n1 });
  const node3 = staticNode({ id: n3, parentId: n1 });

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      const findDesignStub = sandbox()
        .stub(DesignsDAO, "findById")
        .resolves(design);
      const createDesignStub = sandbox()
        .stub(DesignCreator, "default")
        .resolves({ ...design, id: d2 });
      const findRootsStub = sandbox()
        .stub(NodesDAO, "findRootNodesByDesign")
        .resolves([node1]);
      const findTreesStub = sandbox()
        .stub(NodesDAO, "findNodeTrees")
        .resolves([node1, node2, node3]);
      const nodeDupeStub = sandbox()
        .stub(NodeDuplicator, "findAndDuplicateNode")
        .resolves({});

      const result = await findAndDuplicateTemplateDesign(
        trx,
        d1,
        "new-creator"
      );

      t.deepEqual(
        result,
        { ...design, id: d2 },
        "Returns the newly created design"
      );

      t.equal(findDesignStub.callCount, 1);

      t.deepEqual(findDesignStub.args[0][0], d1);
      t.equal(createDesignStub.callCount, 1);

      t.equal(findRootsStub.callCount, 1);
      t.deepEqual(findRootsStub.args[0][0], d1);

      t.equal(findTreesStub.callCount, 1);
      t.deepEqual(findTreesStub.args[0][0], [n1]);

      t.equal(nodeDupeStub.callCount, 1);
      t.deepEqual(
        nodeDupeStub.args[0][0],
        {
          isRoot: true,
          newCreatorId: "new-creator",
          newDesignId: d2,
          nodeId: n1,
          tree: {
            [n1]: [n2, n3],
            [n2]: [],
            [n3]: [],
          },
          trx,
        },
        "Calls the duplication service with the expected values"
      );
    }
  );
});
