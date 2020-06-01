import uuid from "node-uuid";
import tape from "tape";

import { test } from "../../../test-helpers/fresh";
import generateCollection from "../../../test-helpers/factories/collection";
import createUser from "../../../test-helpers/create-user";
import createDesign from "../../../services/create-design";
import DesignEventsDAO from "../../../components/design-events/dao";
import { reverseSubmissionRecords } from "./reverse";
import { moveDesign } from "../../../test-helpers/collections";
import db from "../../../services/db";
import Knex from "knex";

const getId = ({ id }: { id: string }): string => id;

test("reverseSubmissionRecords", async (t: tape.Test) => {
  const { user: designer } = await createUser({ withSession: false });
  const { user: admin } = await createUser({
    role: "ADMIN",
    withSession: false,
  });
  const { user: partner } = await createUser({
    role: "PARTNER",
    withSession: false,
  });
  const { collection: c1 } = await generateCollection({
    createdBy: designer.id,
  });
  const d1 = await createDesign({
    productType: "TEESHIRT",
    title: "Virgil Shirt",
    userId: designer.id,
  });
  await moveDesign(c1.id, d1.id);
  const now = new Date();
  const [, , de3] = await db.transaction(async (trx: Knex.Transaction) => {
    const e1 = await DesignEventsDAO.create(trx, {
      actorId: designer.id,
      bidId: null,
      createdAt: new Date(now.getTime() + 1),
      designId: d1.id,
      id: uuid.v4(),
      quoteId: null,
      targetId: null,
      type: "SUBMIT_DESIGN",
      approvalStepId: null,
      approvalSubmissionId: null,
      taskTypeId: null,
      commentId: null,
    });
    const e2 = await DesignEventsDAO.create(trx, {
      actorId: admin.id,
      bidId: null,
      createdAt: new Date(now.getTime() + 2),
      designId: d1.id,
      id: uuid.v4(),
      quoteId: null,
      targetId: null,
      type: "COMMIT_COST_INPUTS",
      approvalStepId: null,
      approvalSubmissionId: null,
      taskTypeId: null,
      commentId: null,
    });
    const e3 = await DesignEventsDAO.create(trx, {
      actorId: admin.id,
      bidId: null,
      createdAt: new Date(now.getTime() + 3),
      designId: d1.id,
      id: uuid.v4(),
      quoteId: null,
      targetId: partner.id,
      type: "BID_DESIGN",
      approvalStepId: null,
      approvalSubmissionId: null,
      taskTypeId: null,
      commentId: null,
    });

    const initialEvents = await DesignEventsDAO.find(trx, { designId: d1.id });
    t.deepEqual(
      initialEvents.map(getId),
      [e1, e2, e3].map(getId),
      "Contains all events"
    );

    return [e1, e2, e3];
  });

  await reverseSubmissionRecords(c1.id);

  await db.transaction(async (trx: Knex.Transaction) => {
    const result = await DesignEventsDAO.find(trx, { designId: d1.id });
    t.deepEqual(
      result.map(getId),
      [de3].map(getId),
      "Successfully removes only the costing and submission events"
    );
  });
});

test("reverseSubmissionRecords on an empty collection", async (t: tape.Test) => {
  const { user: designer } = await createUser({ withSession: false });
  const { collection: c1 } = await generateCollection({
    createdBy: designer.id,
  });
  const d1 = await createDesign({
    productType: "TEESHIRT",
    title: "Virgil Shirt",
    userId: designer.id,
  });
  await moveDesign(c1.id, d1.id);

  try {
    await reverseSubmissionRecords(c1.id);
    t.fail("Should not successfully go through");
  } catch (error) {
    t.equal(error.message, `No design events found for collection ${c1.id}`);
  }

  const result = await db.transaction((trx: Knex.Transaction) =>
    DesignEventsDAO.find(trx, { designId: d1.id })
  );
  t.deepEqual(result, [], "Has no design events");
});
