import Knex from "knex";
import db from "../db";
import { omit } from "lodash";

import CollaboratorsDAO = require("../../components/collaborators/dao");
import * as CreateDesignTasksService from "../create-design-tasks";
import ProductDesign = require("../../components/product-designs/domain-objects/product-design");
import ProductDesignsDAO = require("../../components/product-designs/dao");
import * as CollectionsDAO from "../../components/collections/dao";
import { moveDesigns } from "../../components/collections/dao/design";
import createDesignApproval from "../create-design-approval";

async function createInTransaction(
  trx: Knex.Transaction,
  data: Unsaved<ProductDesign>
): Promise<ProductDesign> {
  const design = await ProductDesignsDAO.create(
    omit(data, "collectionIds"),
    trx
  );
  if (data.collectionIds && data.collectionIds.length > 1) {
    throw new Error(
      "Could not put design into multiple collections on creation"
    );
  }

  const collection =
    data.collectionIds && data.collectionIds[0]
      ? await CollectionsDAO.findById(data.collectionIds[0], trx)
      : null;

  if (collection) {
    await moveDesigns({
      collectionId: collection.id,
      designIds: [design.id],
      trx,
    });
  }

  if (!collection || !collection.teamId) {
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
  }

  await CreateDesignTasksService.createDesignTasks(
    design.id,
    "POST_CREATION",
    trx
  );
  await createDesignApproval(trx, design.id);

  return design;
}

async function createDesign(
  data: Unsaved<ProductDesign>,
  trx?: Knex.Transaction
): Promise<ProductDesign> {
  if (trx) {
    return createInTransaction(trx, data);
  }

  return db.transaction(
    (newTrx: Knex.Transaction): Promise<ProductDesign> =>
      createInTransaction(newTrx, data)
  );
}

export default createDesign;
