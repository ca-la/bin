import Knex from "knex";

import ProductDesignsDAO from "../../product-designs/dao";
import * as CollaboratorsDAO from "../../collaborators/dao";
import ProductDesign = require("../../product-designs/domain-objects/product-design");
import {
  getDesignPermissionsAndRole,
  PermissionsAndRole,
} from "../../../services/get-permissions";
import { moveDesigns, removeDesigns } from "../dao/design";
import db from "../../../services/db";

type DesignWithPermissions = ProductDesign & PermissionsAndRole;

export function* putDesign(this: AuthedContext): Iterator<any, any, any> {
  const { collectionId, designId } = this.params;

  try {
    yield db.transaction(async (trx: Knex.Transaction) => {
      await moveDesigns({ collectionId, designIds: [designId], trx });
    });
    this.body = yield ProductDesignsDAO.findByCollectionId(collectionId);
    this.status = 200;
  } catch (error) {
    throw error;
  }
}

export function* putDesigns(this: AuthedContext): Iterator<any, any, any> {
  const { collectionId } = this.params;
  const { designIds } = this.query;

  if (!designIds) {
    this.throw(400, "designIds is a required query parameter.");
  }

  const designIdList = designIds.split(",");

  if (designIdList.length === 0) {
    this.throw(400, "designIds must have at least one design.");
  }

  try {
    yield db.transaction(async (trx: Knex.Transaction) => {
      await moveDesigns({ collectionId, designIds: designIdList, trx });
    });

    this.body = yield ProductDesignsDAO.findByCollectionId(collectionId);
    this.status = 200;
  } catch (error) {
    this.throw(500, error.message);
  }
}

export function* deleteDesign(this: AuthedContext): Iterator<any, any, any> {
  const { collectionId, designId } = this.params;
  const { userId } = this.state;
  yield db.transaction(async (trx: Knex.Transaction) => {
    await removeDesigns({ collectionId, designIds: [designId], trx });
    await CollaboratorsDAO.cancelByDesignsAndRole(trx, [designId], "OWNER");
    await CollaboratorsDAO.create(
      {
        cancelledAt: null,
        collectionId: null,
        designId,
        invitationMessage: null,
        role: "OWNER",
        teamId: null,
        userEmail: null,
        userId,
      },
      trx
    );
  });
  this.body = yield ProductDesignsDAO.findByCollectionId(collectionId);
  this.status = 200;
}

export function* deleteDesigns(this: AuthedContext): Iterator<any, any, any> {
  const { collectionId } = this.params;
  const { designIds } = this.query;
  const { userId } = this.state;

  if (!designIds) {
    this.throw(400, "designIds is a required query parameter.");
  }

  const designIdList = designIds.split(",");

  if (designIdList.length === 0) {
    this.throw(400, "designIds must have at least one design.");
  }

  yield db.transaction(async (trx: Knex.Transaction) => {
    await removeDesigns({ collectionId, designIds: designIdList, trx });
    await CollaboratorsDAO.cancelByDesignsAndRole(trx, designIdList, "OWNER");
    await CollaboratorsDAO.createAll(
      designIdList.map((designId: string) => ({
        cancelledAt: null,
        collectionId: null,
        designId,
        invitationMessage: null,
        role: "OWNER",
        teamId: null,
        userEmail: null,
        userId,
      })),
      trx
    );
  });

  this.body = yield ProductDesignsDAO.findByCollectionId(collectionId);
  this.status = 200;
}

export function* getCollectionDesigns(
  this: AuthedContext
): Iterator<any, any, any> {
  const { collectionId } = this.params;
  const { role, userId } = this.state;

  const collectionDesigns = yield ProductDesignsDAO.findByCollectionId(
    collectionId
  );

  const designsWithPermissions: DesignWithPermissions[] = [];

  for (const collectionDesign of collectionDesigns) {
    const permissions = yield getDesignPermissionsAndRole(db, {
      designId: collectionDesign.id,
      sessionRole: role,
      sessionUserId: userId,
    });
    designsWithPermissions.push({ ...collectionDesign, ...permissions });
  }

  this.body = designsWithPermissions;
  this.status = 200;
}
