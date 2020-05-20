import Knex from "knex";
import uuid from "node-uuid";
import { omit } from "lodash";

import { sandbox, test, Test } from "../../../test-helpers/fresh";
import db from "../../../services/db";
import findAndDuplicateMaterial from "./material";
import generateMaterialAttribute from "../../../test-helpers/factories/material-attribute";
import createUser = require("../../../test-helpers/create-user");
import generateNode from "../../../test-helpers/factories/node";
import * as MaterialsDAO from "../../../components/attributes/material-attributes/dao";

test("findAndDuplicateMaterial() failure case", async (t: Test) => {
  const m1 = uuid.v4();
  const userId = uuid.v4();
  const nodeId = uuid.v4();

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      try {
        await findAndDuplicateMaterial({
          currentMaterialId: m1,
          newCreatorId: userId,
          newNodeId: nodeId,
          trx,
        });
        t.fail("Should not get here.");
      } catch (error) {
        t.equal(error.message, `Material attribute ${m1} not found.`);
      }
    }
  );
});

test("findAndDuplicateMaterial() standard case", async (t: Test) => {
  const findStub = sandbox().spy(MaterialsDAO, "findById");
  const { user: newUser } = await createUser({ withSession: false });
  const m1 = uuid.v4();
  const n2 = uuid.v4();

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      await generateNode({ id: n2 }, trx);
      const { material } = await generateMaterialAttribute({ id: m1 }, trx);

      const result = await findAndDuplicateMaterial({
        currentMaterialId: m1,
        newCreatorId: newUser.id,
        newNodeId: n2,
        trx,
      });

      t.notEqual(result.id, material.id);
      t.notEqual(result.createdAt, material.createdAt);
      t.deepEqual(
        omit(result, "id", "createdAt"),
        omit(
          {
            ...material,
            nodeId: n2,
            createdBy: newUser.id,
          },
          "id",
          "createdAt"
        )
      );

      t.equal(findStub.callCount, 1, "The findById function is called once.");
    }
  );
});

test("findAndDuplicateMaterial() with a material object passed in", async (t: Test) => {
  const findStub = sandbox().spy(MaterialsDAO, "findById");
  const { user: newUser } = await createUser({ withSession: false });
  const m1 = uuid.v4();
  const n2 = uuid.v4();

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      await generateNode({ id: n2 }, trx);
      const { material } = await generateMaterialAttribute({ id: m1 }, trx);

      const result = await findAndDuplicateMaterial({
        currentMaterial: material,
        currentMaterialId: m1,
        newCreatorId: newUser.id,
        newNodeId: n2,
        trx,
      });

      t.notEqual(result.id, material.id);
      t.notEqual(result.createdAt, material.createdAt);
      t.deepEqual(
        omit(result, "id", "createdAt"),
        omit(
          {
            ...material,
            nodeId: n2,
            createdBy: newUser.id,
          },
          "id",
          "createdAt"
        )
      );

      t.equal(findStub.callCount, 0, "The findById function is never called.");
    }
  );
});
