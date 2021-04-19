import uuid from "node-uuid";
import tape from "tape";

import * as ImgixService from "../../services/imgix";
import { sandbox, test } from "../../test-helpers/fresh";
import { create } from "./dao";
import { ComponentType } from "./types";
import createUser from "../../test-helpers/create-user";
import generateAsset from "../../test-helpers/factories/asset";
import { splitComponent, NonSplittableComponentError } from "./split";
import db from "../../services/db";

test("splitComponent splits components", async (t: tape.Test) => {
  sandbox().stub(ImgixService, "getPageCount").resolves(3);

  const { user } = await createUser({ withSession: false });
  const { asset } = await generateAsset({
    description: "",
    id: uuid.v4(),
    mimeType: "application/pdf",
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: "a component",
    userId: user.id,
  });
  const data = {
    artworkId: null,
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: new Date(),
    id: uuid.v4(),
    materialId: null,
    parentId: null,
    sketchId: asset.id,
    type: ComponentType.Sketch,
    assetPageNumber: null,
  };
  const inserted = await create(data);

  const trx = await db.transaction();
  try {
    const result = await splitComponent(trx, inserted);
    t.equal(result.length, 3);
    t.equal(result[0].assetPageNumber, 1);
    t.equal(result[1].assetPageNumber, 2);
    t.equal(result[2].assetPageNumber, 3);
  } finally {
    await trx.rollback();
  }
});

test("splitComponent rejects un-splittable components", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const { asset } = await generateAsset({
    description: "",
    id: uuid.v4(),
    mimeType: "image/jpeg",
    originalHeightPx: 0,
    originalWidthPx: 0,
    title: "a component",
    userId: user.id,
  });
  const data = {
    artworkId: null,
    createdAt: new Date(),
    createdBy: user.id,
    deletedAt: new Date(),
    id: uuid.v4(),
    materialId: null,
    parentId: null,
    sketchId: asset.id,
    type: ComponentType.Sketch,
    assetPageNumber: null,
  };
  const inserted = await create(data);

  const trx = await db.transaction();
  try {
    await splitComponent(trx, inserted);
    throw new Error("Shouldn't get here");
  } catch (err) {
    t.equal(err instanceof NonSplittableComponentError, true);
    t.equal(err.message, "Cannot split this type of file");
  } finally {
    await trx.rollback();
  }
});
