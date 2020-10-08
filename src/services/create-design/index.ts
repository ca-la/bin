import Knex from "knex";
import db from "../db";

import CollaboratorsDAO = require("../../components/collaborators/dao");
import createDesignTasks from "../create-design-tasks";
import ProductDesign = require("../../components/product-designs/domain-objects/product-design");
import ProductDesignsDAO = require("../../components/product-designs/dao");
import createDesignApproval from "../create-design-approval";

async function createInTransaction(
  data: Unsaved<ProductDesign>,
  trx: Knex.Transaction
): Promise<ProductDesign> {
  const design = await ProductDesignsDAO.create(data, trx);

  await CollaboratorsDAO.create(
    {
      cancelledAt: null,
      collectionId: null,
      designId: design.id,
      invitationMessage: "",
      role: "EDIT",
      userEmail: null,
      userId: design.userId,
      teamId: null,
    },
    trx
  );

  await createDesignTasks(design.id, "POST_CREATION", trx);
  await createDesignApproval(trx, design.id);

  return design;
}

async function createDesign(
  data: Unsaved<ProductDesign>,
  trx?: Knex.Transaction
): Promise<ProductDesign> {
  if (trx) {
    return createInTransaction(data, trx);
  }

  return db.transaction(
    (newTrx: Knex.Transaction): Promise<ProductDesign> =>
      createInTransaction(data, newTrx)
  );
}

export default createDesign;
