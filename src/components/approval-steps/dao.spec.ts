import Knex from "knex";
import * as uuid from "node-uuid";

import { test, Test } from "../../test-helpers/fresh";
import * as ProductDesignsDAO from "../product-designs/dao/dao";
import db from "../../services/db";
import ProductDesign from "../product-designs/domain-objects/product-design";

import ApprovalStep, {
  ApprovalStepState,
  ApprovalStepType,
} from "./domain-object";
import * as ApprovalStepsDAO from "./dao";
import createUser from "../../test-helpers/create-user";

test("ApprovalStepsDAO can create multiple steps and retrieve by design", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const [d1, d2] = await db.transaction((trx: Knex.Transaction) =>
    Promise.all([
      ProductDesignsDAO.create(trx, "Design One", user.id),
      ProductDesignsDAO.create(trx, "Design Two", user.id),
    ])
  );

  const as1: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: "Checkout",
    ordering: 0,
    designId: d1.id,
    reason: null,
    type: ApprovalStepType.CHECKOUT,
    collaboratorId: null,
    teamUserId: null,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
    dueAt: null,
  };
  const as2: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: "Technical Design",
    ordering: 1,
    designId: d1.id,
    reason: null,
    type: ApprovalStepType.TECHNICAL_DESIGN,
    collaboratorId: null,
    teamUserId: null,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
    dueAt: null,
  };
  const as3: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: "Checkout",
    ordering: 0,
    designId: d2.id,
    reason: null,
    type: ApprovalStepType.CHECKOUT,
    collaboratorId: null,
    teamUserId: null,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
    dueAt: null,
  };
  const as4: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: "Technical Design",
    ordering: 1,
    designId: d2.id,
    reason: null,
    type: ApprovalStepType.TECHNICAL_DESIGN,
    collaboratorId: null,
    teamUserId: null,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
    dueAt: null,
  };

  const created = await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.createAll(trx, [as1, as2, as3, as4])
  );

  t.deepEqual(created, [as1, as2, as3, as4], "returns inserted steps");

  const found = await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.findByDesign(trx, d1.id)
  );

  t.deepEqual(found, [as1, as2], "returns steps by design");
});

test("ApprovalStepsDAO can retrieve by step id", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const d1: ProductDesign = await db.transaction((trx: Knex.Transaction) =>
    ProductDesignsDAO.create(trx, "Design One", user.id)
  );
  const as1: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: "Checkout",
    ordering: 0,
    designId: d1.id,
    reason: null,
    type: ApprovalStepType.CHECKOUT,
    collaboratorId: null,
    teamUserId: null,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
    dueAt: null,
  };

  await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.createAll(trx, [as1])
  );

  const found = await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.findById(trx, as1.id)
  );

  t.deepEqual(found, as1, "returns steps by design");

  const notFound = await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.findById(trx, uuid.v4())
  );

  t.equals(notFound, null, "returns null when query does not find a row");
});
