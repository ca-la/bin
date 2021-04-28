import tape from "tape";
import Knex from "knex";

import { test } from "../../test-helpers/fresh";
import {
  create,
  createAll,
  findAllByDesignId,
  findAllTitles,
  findById,
} from "./index";
import createUser from "../../test-helpers/create-user";
import * as ProductDesignsDAO from "../../components/product-designs/dao/dao";
import db from "../../services/db";

test("ProductDesign Stage DAO supports creation/retrieval", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const design = await db.transaction((trx: Knex.Transaction) =>
    ProductDesignsDAO.create(trx, "Test", user.id)
  );
  const stage = await create({
    description: "",
    designId: design.id,
    ordering: 0,
    title: "test",
  });

  const result = await findById(stage.id);
  t.deepEqual(result, stage, "Returned inserted task");
});

test("ProductDesign Stage DAO supports retrieval by designId", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const design = await db.transaction((trx: Knex.Transaction) =>
    ProductDesignsDAO.create(trx, "Test", user.id)
  );
  const stage = await create({
    description: "",
    designId: design.id,
    ordering: 0,
    title: "test",
  });
  const stageTwo = await create({
    description: "",
    designId: design.id,
    ordering: 1,
    title: "test 2",
  });
  const stageThree = await create({
    description: "",
    designId: design.id,
    ordering: 2,
    title: "test 3",
  });

  const result = await findAllByDesignId(stage.designId);
  t.deepEqual(result[0], stage, "Returned inserted design stage");
  t.deepEqual(result[1], stageTwo, "Returned inserted design stage");
  t.deepEqual(result[2], stageThree, "Returned inserted design stage");
});

test("ProductDesignStagesDAO.findAllTitles", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const design = await db.transaction((trx: Knex.Transaction) =>
    ProductDesignsDAO.create(trx, "Test", user.id)
  );
  await create({
    description: "",
    designId: design.id,
    ordering: 0,
    title: "test",
  });
  await create({
    description: "",
    designId: design.id,
    ordering: 0,
    title: "test",
  });

  await create({
    description: "",
    designId: design.id,
    ordering: 1,
    title: "test 2",
  });
  await create({
    description: "",
    designId: design.id,
    ordering: 0,
    title: "test 2",
  });

  const result = await findAllTitles();
  t.deepEqual(result, ["test", "test 2"], "Returns unique titles");
});

test("ProductDesign Stage DAO supports create all", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const design = await db.transaction((trx: Knex.Transaction) =>
    ProductDesignsDAO.create(trx, "Test", user.id)
  );
  const stages = await createAll([
    {
      description: "",
      designId: design.id,
      ordering: 0,
      title: "test",
    },
    {
      description: "",
      designId: design.id,
      ordering: 0,
      title: "test 2",
    },
  ]);

  const result = await findById(stages[0].id);
  const result2 = await findById(stages[1].id);
  t.deepEqual(result, stages[0], "Returned inserted task");
  t.deepEqual(result2, stages[1], "Returned inserted task");
});
