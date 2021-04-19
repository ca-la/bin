import tape from "tape";
import uuid from "node-uuid";
import Knex from "knex";

import db from "../../services/db";
import { test } from "../../test-helpers/fresh";
import createUser = require("../../test-helpers/create-user");

import { ComponentType } from "../../components/components/types";
import { create as createComponent } from "../../components/components/dao";
import { findAndDuplicateComponent } from "./components";
import generateAsset from "../../test-helpers/factories/asset";

test("findAndDuplicateComponent with sub-resources", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const imageId = uuid.v4();
  const imageData = {
    description: "",
    id: imageId,
    mimeType: "image/png",
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: "",
    userId: user.id,
  };
  await generateAsset(imageData);

  const componentId = uuid.v4();
  const componentData = {
    artworkId: null,
    createdBy: user.id,
    id: componentId,
    materialId: null,
    parentId: null,
    sketchId: imageId,
    type: ComponentType.Sketch,
    assetPageNumber: null,
  };
  await createComponent(componentData);

  await db.transaction(async (trx: Knex.Transaction) => {
    const duplicateComponent = await findAndDuplicateComponent(
      componentId,
      null,
      trx
    );
    t.deepEqual(
      {
        artworkId: duplicateComponent.artworkId,
        createdBy: duplicateComponent.createdBy,
        id: duplicateComponent.id,
        materialId: duplicateComponent.materialId,
        parentId: duplicateComponent.parentId,
        sketchId: duplicateComponent.sketchId,
        type: duplicateComponent.type,
        assetPageNumber: null,
      },
      {
        ...componentData,
        id: duplicateComponent.id,
        sketchId: duplicateComponent.sketchId,
      },
      "Duplicating a component returns the same component but with a new id"
    );
  });
});
