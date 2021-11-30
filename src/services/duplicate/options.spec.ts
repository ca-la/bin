import tape from "tape";
import uuid from "node-uuid";
import Knex from "knex";

import db from "../../services/db";
import { test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";

import ProductDesignsDAO from "../../components/product-design-options/dao";
import { findAndDuplicateOption } from "./options";
import generateAsset from "../../test-helpers/factories/asset";

test("findAndDuplicateOption without sub-resources", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const optionId = uuid.v4();
  const optionData = {
    id: optionId,
    title: "some_random_title",
    type: "FABRIC",
    userId: user.id,
  };

  await db.transaction(async (trx: Knex.Transaction) => {
    await ProductDesignsDAO.create(
      trx,
      ProductDesignsDAO.getOptionDefaults(optionData)
    );
    const duplicatedOption = await findAndDuplicateOption(optionId, trx);
    t.deepEqual(
      {
        id: duplicatedOption.id,
        title: duplicatedOption.title,
        type: duplicatedOption.type,
        userId: duplicatedOption.userId,
      },
      {
        ...optionData,
        id: duplicatedOption.id,
      },
      "Duplicating an option returns the same option but with a new id"
    );
  });
});

test("findAndDuplicateOption with sub-resources", async (t: tape.Test) => {
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

  const optionId = uuid.v4();
  const optionData = {
    id: optionId,
    previewImageId: imageId,
    title: "some_random_title",
    type: "FABRIC",
    userId: user.id,
  };
  await db.transaction(async (trx: Knex.Transaction) => {
    await ProductDesignsDAO.create(
      trx,
      ProductDesignsDAO.getOptionDefaults(optionData)
    );

    const duplicatedOption = await findAndDuplicateOption(optionId, trx);
    t.deepEqual(
      {
        id: duplicatedOption.id,
        previewImageId: duplicatedOption.previewImageId,
        title: duplicatedOption.title,
        type: duplicatedOption.type,
        userId: duplicatedOption.userId,
      },
      {
        ...optionData,
        id: duplicatedOption.id,
        previewImageId: imageId,
      },
      "Duplicating an option returns the same option but with a new id"
    );
  });
});
