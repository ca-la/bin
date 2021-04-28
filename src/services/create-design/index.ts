import Knex from "knex";
import db from "../db";

import CollaboratorsDAO = require("../../components/collaborators/dao");
import * as CreateDesignTasksService from "../create-design-tasks";
import ProductDesign = require("../../components/product-designs/domain-objects/product-design");
import * as ProductDesignsDAO from "../../components/product-designs/dao/dao";
import * as CollectionsDAO from "../../components/collections/dao";
import { moveDesigns } from "../../components/collections/dao/design";
import createDesignApproval from "../create-design-approval";

export interface UnsavedDesign {
  title: string;
  userId: string;
  /** @deprecated */
  productType?: string | null;
}

export interface UnsavedDesignWithCollections extends UnsavedDesign {
  collectionIds?: string[] | null;
}

async function createInTransaction(
  trx: Knex.Transaction,
  data: UnsavedDesignWithCollections
): Promise<ProductDesign> {
  const design = await ProductDesignsDAO.create(trx, data.title, data.userId);
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
        invitationMessage: null,
        role: "OWNER",
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
  data: UnsavedDesignWithCollections,
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
